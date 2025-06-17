// controllers/monitoringController.js
const db = require('../config/database');

// Get elderly list for monitoring
const getElderlyList = async (req, res) => {
    try {
        const [elderly] = await db.query(`
            SELECT 
                u.id,
                u.full_name,
                u.phone,
                u.date_of_birth,
                COUNT(DISTINCT fer.family_user_id) as family_count
            FROM users u
            LEFT JOIN family_elderly_relations fer ON u.id = fer.elderly_user_id
            WHERE u.role = 'elderly'
            GROUP BY u.id
            ORDER BY u.full_name
        `);

        res.json({
            success: true,
            data: elderly
        });
    } catch (error) {
        console.error('Error getting elderly list:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil daftar lansia'
        });
    }
};

// Get monitoring data for specific elderly
const getElderlyMonitoring = async (req, res) => {
    try {
        const { elderlyId } = req.params;

        // Get elderly info
        const [elderlyData] = await db.query(
            'SELECT * FROM users WHERE id = ? AND role = "elderly"',
            [elderlyId]
        );

        if (elderlyData.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lansia tidak ditemukan'
            });
        }

        const elderly = elderlyData[0];

        // Get latest health record
        const [healthRecords] = await db.query(`
            SELECT * FROM health_records 
            WHERE user_id = ? 
            ORDER BY recorded_at DESC 
            LIMIT 1
        `, [elderlyId]);

        // Get medicines
        const [medicines] = await db.query(`
            SELECT * FROM medicines
            WHERE user_id = ? AND is_active = TRUE
            ORDER BY time_schedule
        `, [elderlyId]);

        // Get today's medicine logs
        const medicinesWithStatus = [];
        for (const med of medicines) {
            const [logs] = await db.query(`
                SELECT * FROM medicine_logs 
                WHERE medicine_id = ? 
                AND DATE(taken_at) = CURDATE()
                ORDER BY taken_at DESC
                LIMIT 1
            `, [med.id]);
            
            medicinesWithStatus.push({
                ...med,
                status: logs.length > 0 ? logs[0].status : 'pending'
            });
        }

        // Get appointments
        const [appointments] = await db.query(`
            SELECT * FROM appointments
            WHERE user_id = ? 
            AND appointment_date >= CURDATE()
            ORDER BY appointment_date, appointment_time
            LIMIT 5
        `, [elderlyId]);

        // Get family contacts
        const [familyContacts] = await db.query(`
            SELECT 
                u.full_name as name,
                u.email,
                u.phone,
                fer.relationship
            FROM family_elderly_relations fer
            JOIN users u ON fer.family_user_id = u.id
            WHERE fer.elderly_user_id = ?
        `, [elderlyId]);

        // Get emergency contacts
        const [emergencyContacts] = await db.query(`
            SELECT * FROM emergency_contacts
            WHERE user_id = ?
            ORDER BY priority
        `, [elderlyId]);

        // Format response
        const response = {
            elderly: {
                id: elderly.id,
                full_name: elderly.full_name,
                phone: elderly.phone,
                address: elderly.address,
                date_of_birth: elderly.date_of_birth
            },
            health: healthRecords[0] || null,
            medicines: medicinesWithStatus,
            appointments: appointments,
            family_contacts: familyContacts,
            emergency_contacts: emergencyContacts
        };

        res.json({
            success: true,
            data: response
        });
    } catch (error) {
        console.error('Error getting elderly monitoring:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data monitoring'
        });
    }
};

// Add health record
const addHealthRecord = async (req, res) => {
    try {
        const { elderlyId } = req.params;
        const {
            blood_pressure_systolic,
            blood_pressure_diastolic,
            blood_sugar_level,
            heart_rate,
            temperature,
            weight,
            height,
            notes
        } = req.body;

        // Insert health record
        const [result] = await db.query(`
            INSERT INTO health_records 
            (user_id, blood_pressure_systolic, blood_pressure_diastolic, 
             blood_sugar_level, heart_rate, temperature, weight, height, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            elderlyId,
            blood_pressure_systolic,
            blood_pressure_diastolic,
            blood_sugar_level || null,
            heart_rate || null,
            temperature || null,
            weight || null,
            height || null,
            notes || null
        ]);

        res.json({
            success: true,
            message: 'Data kesehatan berhasil dicatat',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('Error adding health record:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mencatat data kesehatan'
        });
    }
};

// Log medicine taken
const logMedicine = async (req, res) => {
    try {
        const { medicineId } = req.params;
        const { status = 'taken', notes } = req.body;

        // Insert medicine log
        await db.query(`
            INSERT INTO medicine_logs (medicine_id, status, notes)
            VALUES (?, ?, ?)
        `, [medicineId, status, notes || null]);

        res.json({
            success: true,
            message: 'Status obat berhasil dicatat'
        });
    } catch (error) {
        console.error('Error logging medicine:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mencatat status obat'
        });
    }
};

// Get health history for charts
const getHealthHistory = async (req, res) => {
    try {
        const { elderlyId } = req.params;
        const { days = 7 } = req.query;

        const [history] = await db.query(`
            SELECT 
                DATE(recorded_at) as date,
                AVG(blood_pressure_systolic) as avg_systolic,
                AVG(blood_pressure_diastolic) as avg_diastolic,
                AVG(heart_rate) as avg_heart_rate,
                AVG(blood_sugar_level) as avg_blood_sugar
            FROM health_records
            WHERE user_id = ? 
            AND recorded_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY DATE(recorded_at)
            ORDER BY date
        `, [elderlyId, parseInt(days)]);

        res.json({
            success: true,
            data: history
        });
    } catch (error) {
        console.error('Error getting health history:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil riwayat kesehatan'
        });
    }
};

// Get activity logs
const getActivityLogs = async (req, res) => {
    try {
        const { elderlyId } = req.params;

        const [logs] = await db.query(`
            SELECT 
                al.action,
                al.description,
                al.created_at,
                u.full_name as performed_by
            FROM activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.user_id = ?
            AND DATE(al.created_at) = CURDATE()
            ORDER BY al.created_at DESC
            LIMIT 20
        `, [elderlyId]);

        res.json({
            success: true,
            data: logs
        });
    } catch (error) {
        console.error('Error getting activity logs:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil log aktivitas'
        });
    }
};

// Create notification/alert
const createAlert = async (req, res) => {
    try {
        const { elderly_id, type, title, message } = req.body;

        // Create notification for elderly
        await db.query(`
            INSERT INTO notifications (user_id, type, title, message)
            VALUES (?, ?, ?, ?)
        `, [elderly_id, type || 'alert', title, message]);

        // Also notify family members
        const [familyMembers] = await db.query(`
            SELECT family_user_id FROM family_elderly_relations
            WHERE elderly_user_id = ?
        `, [elderly_id]);

        for (const family of familyMembers) {
            await db.query(`
                INSERT INTO notifications (user_id, type, title, message)
                VALUES (?, ?, ?, ?)
            `, [
                family.family_user_id,
                'family_alert',
                title,
                message
            ]);
        }

        res.json({
            success: true,
            message: 'Alert berhasil dibuat'
        });
    } catch (error) {
        console.error('Error creating alert:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal membuat alert'
        });
    }
};

module.exports = {
    getElderlyList,
    getElderlyMonitoring,
    addHealthRecord,
    logMedicine,
    getHealthHistory,
    getActivityLogs,
    createAlert
};