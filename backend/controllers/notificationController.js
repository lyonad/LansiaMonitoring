// controllers/notificationController.js
const db = require('../config/database');

// Send medicine reminders
const sendMedicineReminders = async () => {
    try {
        // Get current time
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        // Format time for comparison
        const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}:00`;
        
        // Get medicines that need reminders
        const [medicines] = await db.query(`
            SELECT m.*, u.full_name, u.email, u.phone
            FROM medicines m
            JOIN users u ON m.user_id = u.id
            WHERE m.is_active = TRUE 
            AND m.time_schedule >= ? 
            AND m.time_schedule < DATE_ADD(?, INTERVAL 1 HOUR)
            AND m.start_date <= CURDATE()
            AND (m.end_date IS NULL OR m.end_date >= CURDATE())
        `, [currentTime, currentTime]);
        
        // Process each medicine reminder
        for (const medicine of medicines) {
            // Check if reminder already sent today
            const [existing] = await db.query(`
                SELECT id FROM medicine_logs 
                WHERE medicine_id = ? 
                AND DATE(taken_at) = CURDATE()
            `, [medicine.id]);
            
            if (existing.length === 0) {
                // Create notification
                await db.query(`
                    INSERT INTO notifications (user_id, type, title, message)
                    VALUES (?, 'medicine_reminder', 'Pengingat Obat', ?)
                `, [
                    medicine.user_id,
                    `Waktunya minum obat: ${medicine.medicine_name} (${medicine.dosage})`
                ]);
                
                console.log(`Medicine reminder sent for ${medicine.full_name}: ${medicine.medicine_name}`);
                
                // Here you would integrate with SMS/Email service
                // Example: await sendSMS(medicine.phone, message);
                // Example: await sendEmail(medicine.email, subject, message);
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error sending medicine reminders:', error);
        return false;
    }
};

// Send appointment reminders
const sendAppointmentReminders = async () => {
    try {
        // Get appointments for tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDate = tomorrow.toISOString().split('T')[0];
        
        const [appointments] = await db.query(`
            SELECT a.*, u.full_name, u.email, u.phone
            FROM appointments a
            JOIN users u ON a.user_id = u.id
            WHERE a.appointment_date = ?
            AND a.status = 'scheduled'
            AND a.reminder_sent = FALSE
        `, [tomorrowDate]);
        
        for (const appointment of appointments) {
            // Create notification
            await db.query(`
                INSERT INTO notifications (user_id, type, title, message)
                VALUES (?, 'appointment_reminder', 'Pengingat Jadwal', ?)
            `, [
                appointment.user_id,
                `Jadwal besok: ${appointment.title} pukul ${appointment.appointment_time} di ${appointment.location || 'lokasi yang telah ditentukan'}`
            ]);
            
            // Mark reminder as sent
            await db.query(`
                UPDATE appointments 
                SET reminder_sent = TRUE 
                WHERE id = ?
            `, [appointment.id]);
            
            console.log(`Appointment reminder sent for ${appointment.full_name}: ${appointment.title}`);
        }
        
        return true;
    } catch (error) {
        console.error('Error sending appointment reminders:', error);
        return false;
    }
};

// Get notifications for user
const getUserNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        
        const [notifications] = await db.query(`
            SELECT * FROM notifications 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `, [userId, parseInt(limit), offset]);
        
        // Get total count
        const [countResult] = await db.query(
            'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?',
            [userId]
        );
        
        res.json({
            success: true,
            data: {
                notifications,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: countResult[0].total,
                    totalPages: Math.ceil(countResult[0].total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil notifikasi'
        });
    }
};

// Mark notification as read
const markAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user.id;
        
        await db.query(`
            UPDATE notifications 
            SET is_read = TRUE 
            WHERE id = ? AND user_id = ?
        `, [notificationId, userId]);
        
        res.json({
            success: true,
            message: 'Notifikasi telah dibaca'
        });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menandai notifikasi'
        });
    }
};

// Mark all as read
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        
        await db.query(`
            UPDATE notifications 
            SET is_read = TRUE 
            WHERE user_id = ? AND is_read = FALSE
        `, [userId]);
        
        res.json({
            success: true,
            message: 'Semua notifikasi telah dibaca'
        });
    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menandai semua notifikasi'
        });
    }
};

// Get unread count
const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [result] = await db.query(`
            SELECT COUNT(*) as unread_count 
            FROM notifications 
            WHERE user_id = ? AND is_read = FALSE
        `, [userId]);
        
        res.json({
            success: true,
            data: {
                unreadCount: result[0].unread_count
            }
        });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil jumlah notifikasi'
        });
    }
};

module.exports = {
    sendMedicineReminders,
    sendAppointmentReminders,
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount
};