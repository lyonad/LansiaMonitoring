// controllers/reportController.js
const db = require('../config/database');

// Generate overall elderly report
const generateOverallReport = async (req, res) => {
    try {
        const { startDate, endDate, reportType = 'overall' } = req.query;
        
        // Validate dates
        const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const end = endDate || new Date().toISOString().split('T')[0];
        
        // Get all elderly users
        const [elderlyUsers] = await db.query(
            `SELECT id, full_name, date_of_birth, blood_type, medical_conditions, phone, address 
             FROM users 
             WHERE role = 'elderly' AND is_active = TRUE 
             ORDER BY full_name`
        );
        
        // Overall statistics
        const [overallStats] = await db.query(`
            SELECT 
                COUNT(DISTINCT u.id) as total_elderly,
                COUNT(DISTINCT fer.family_user_id) as total_family,
                COUNT(DISTINCT ma.medical_id) as total_medical_staff,
                AVG(YEAR(CURDATE()) - YEAR(u.date_of_birth)) as average_age
            FROM users u
            LEFT JOIN family_elderly_relations fer ON u.id = fer.elderly_user_id
            LEFT JOIN medical_assignments ma ON u.id = ma.elderly_id AND ma.is_active = TRUE
            WHERE u.role = 'elderly' AND u.is_active = TRUE
        `);
        
        // Vital signs summary
        const [vitalsSummary] = await db.query(`
            SELECT 
                COUNT(DISTINCT elderly_id) as elderly_with_vitals,
                COUNT(*) as total_measurements,
                AVG(blood_pressure_sys) as avg_sys,
                AVG(blood_pressure_dia) as avg_dia,
                AVG(heart_rate) as avg_heart_rate,
                AVG(blood_sugar) as avg_blood_sugar,
                AVG(oxygen_saturation) as avg_oxygen
            FROM vital_signs
            WHERE DATE(measurement_date) BETWEEN ? AND ?
        `, [start, end]);
        
        // Critical vital signs count
        const [criticalVitals] = await db.query(`
            SELECT 
                COUNT(CASE WHEN vs.blood_pressure_sys > COALESCE(vt.sys_max, 140) OR vs.blood_pressure_sys < COALESCE(vt.sys_min, 90) THEN 1 END) as critical_bp,
                COUNT(CASE WHEN vs.heart_rate > COALESCE(vt.heart_rate_max, 100) OR vs.heart_rate < COALESCE(vt.heart_rate_min, 60) THEN 1 END) as critical_hr,
                COUNT(CASE WHEN vs.oxygen_saturation < COALESCE(vt.oxygen_min, 95) THEN 1 END) as critical_oxygen
            FROM vital_signs vs
            LEFT JOIN vital_thresholds vt ON vs.elderly_id = vt.elderly_id
            WHERE DATE(vs.measurement_date) BETWEEN ? AND ?
        `, [start, end]);
        
        // Medication compliance
        const [medicationCompliance] = await db.query(`
            SELECT 
                COUNT(DISTINCT m.elderly_id) as elderly_with_medication,
                COUNT(DISTINCT m.id) as total_medicines,
                COUNT(CASE WHEN ml.status = 'taken' THEN 1 END) as taken_count,
                COUNT(CASE WHEN ml.status = 'missed' THEN 1 END) as missed_count,
                ROUND(
                    COUNT(CASE WHEN ml.status = 'taken' THEN 1 END) * 100.0 / 
                    NULLIF(COUNT(ml.id), 0), 2
                ) as compliance_rate
            FROM medicines m
            LEFT JOIN medicine_logs ml ON m.id = ml.medicine_id AND DATE(ml.taken_at) BETWEEN ? AND ?
            WHERE m.is_active = TRUE
        `, [start, end]);
        
        // Activity summary
        const [activitySummary] = await db.query(`
            SELECT 
                activity_type,
                COUNT(*) as count,
                AVG(value) as avg_value
            FROM activities
            WHERE DATE(activity_date) BETWEEN ? AND ?
            GROUP BY activity_type
        `, [start, end]);
        
        // Appointment statistics
        const [appointmentStats] = await db.query(`
            SELECT 
                COUNT(*) as total_appointments,
                COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
                COUNT(CASE WHEN status = 'missed' THEN 1 END) as missed
            FROM appointments
            WHERE DATE(appointment_date) BETWEEN ? AND ?
        `, [start, end]);
        
        // Alert summary
        const [alertSummary] = await db.query(`
            SELECT 
                alert_type,
                COUNT(*) as count,
                COUNT(CASE WHEN is_dismissed = FALSE THEN 1 END) as active_count
            FROM monitoring_alerts
            WHERE DATE(created_at) BETWEEN ? AND ?
            GROUP BY alert_type
        `, [start, end]);
        
        // Get detailed info for each elderly
        const elderlyDetails = [];
        for (const elderly of elderlyUsers) {
            // Get latest vital signs
            const [latestVital] = await db.query(`
                SELECT * FROM vital_signs 
                WHERE elderly_id = ? 
                ORDER BY measurement_date DESC 
                LIMIT 1
            `, [elderly.id]);
            
            // Get family members
            const [familyMembers] = await db.query(`
                SELECT u.full_name, u.phone, fer.relationship 
                FROM family_elderly_relations fer
                JOIN users u ON fer.family_user_id = u.id
                WHERE fer.elderly_user_id = ?
            `, [elderly.id]);
            
            // Get active medicines count
            const [medicineCount] = await db.query(`
                SELECT COUNT(*) as count 
                FROM medicines 
                WHERE elderly_id = ? AND is_active = TRUE
            `, [elderly.id]);
            
            // Get recent activity
            const [recentActivity] = await db.query(`
                SELECT MAX(activity_date) as last_activity 
                FROM activities 
                WHERE elderly_id = ?
            `, [elderly.id]);
            
            elderlyDetails.push({
                ...elderly,
                age: elderly.date_of_birth ? Math.floor((new Date() - new Date(elderly.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000)) : null,
                latestVital: latestVital[0] || null,
                familyMembers,
                activeMedicines: medicineCount[0].count,
                lastActivity: recentActivity[0].last_activity
            });
        }
        
        // Generate report data
        const reportData = {
            metadata: {
                reportType,
                generatedAt: new Date(),
                period: { start, end },
                generatedBy: req.user.full_name
            },
            summary: {
                overall: overallStats[0],
                vitals: {
                    ...vitalsSummary[0],
                    critical: criticalVitals[0]
                },
                medication: medicationCompliance[0],
                appointments: appointmentStats[0],
                alerts: alertSummary
            },
            activities: activitySummary,
            elderlyDetails
        };
        
        // Save report to database - for overall reports, elderly_id is null
        const [result] = await db.query(
            `INSERT INTO health_reports (elderly_id, report_type, start_date, end_date, report_data, created_by) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [null, 'overall', start, end, JSON.stringify(reportData), req.user.id]
        );
        
        res.json({
            success: true,
            data: {
                reportId: result.insertId,
                report: reportData
            }
        });
        
    } catch (error) {
        console.error('Generate overall report error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal membuat laporan'
        });
    }
};

// Get saved reports
const getSavedReports = async (req, res) => {
    try {
        const { page = 1, limit = 10, reportType } = req.query;
        const offset = (page - 1) * limit;
        
        let query = `
            SELECT 
                hr.*,
                u.full_name as elderly_name,
                creator.full_name as created_by_name
            FROM health_reports hr
            LEFT JOIN users u ON hr.elderly_id = u.id
            JOIN users creator ON hr.created_by = creator.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (reportType) {
            query += ' AND hr.report_type = ?';
            params.push(reportType);
        }
        
        // Count total
        const countQuery = query.replace('hr.*, u.full_name as elderly_name, creator.full_name as created_by_name', 'COUNT(*) as total');
        const [countResult] = await db.query(countQuery, params);
        const total = countResult[0].total;
        
        // Get reports with pagination
        query += ' ORDER BY hr.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const [reports] = await db.query(query, params);
        
        // Parse JSON data - handle old and new formats
        const parsedReports = reports.map(report => {
            let reportData = {};
            try {
                reportData = JSON.parse(report.report_data || '{}');
            } catch (e) {
                console.error('Error parsing report data for ID:', report.id, e);
                reportData = {};
            }
            
            return {
                id: report.id,
                elderly_id: report.elderly_id,
                elderly_name: report.elderly_name,
                report_type: report.report_type,
                start_date: report.start_date,
                end_date: report.end_date,
                created_at: report.created_at,
                created_by: report.created_by,
                created_by_name: report.created_by_name,
                report_data: reportData
            };
        });
        
        res.json({
            success: true,
            data: {
                reports: parsedReports,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
        
    } catch (error) {
        console.error('Get saved reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil laporan'
        });
    }
};

// Get report by ID
const getReportById = async (req, res) => {
    try {
        const { reportId } = req.params;
        
        const [reports] = await db.query(`
            SELECT 
                hr.*,
                u.full_name as elderly_name,
                creator.full_name as created_by_name
            FROM health_reports hr
            LEFT JOIN users u ON hr.elderly_id = u.id
            JOIN users creator ON hr.created_by = creator.id
            WHERE hr.id = ?
        `, [reportId]);
        
        if (reports.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Laporan tidak ditemukan'
            });
        }
        
        // Parse report_data and ensure it's properly structured
        let reportData;
        try {
            reportData = JSON.parse(reports[0].report_data || '{}');
        } catch (e) {
            console.error('Error parsing report data:', e);
            reportData = {};
        }
        
        res.json({
            success: true,
            data: {
                id: reports[0].id,
                elderly_id: reports[0].elderly_id,
                elderly_name: reports[0].elderly_name,
                report_type: reports[0].report_type,
                start_date: reports[0].start_date,
                end_date: reports[0].end_date,
                created_at: reports[0].created_at,
                created_by: reports[0].created_by,
                created_by_name: reports[0].created_by_name,
                report_data: reportData
            }
        });
        
    } catch (error) {
        console.error('Get report by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil laporan'
        });
    }
};

// Delete report
const deleteReport = async (req, res) => {
    try {
        const { reportId } = req.params;
        
        console.log('Delete report request for ID:', reportId);
        
        // Check if report exists
        const [reports] = await db.query('SELECT id FROM health_reports WHERE id = ?', [reportId]);
        
        if (reports.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Laporan tidak ditemukan'
            });
        }
        
        // Delete report
        await db.query('DELETE FROM health_reports WHERE id = ?', [reportId]);
        
        // Log activity
        await db.query(
            'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
            [req.user.id, 'DELETE_REPORT', `Menghapus laporan ID: ${reportId}`, req.ip]
        );
        
        console.log('Report deleted successfully:', reportId);
        
        res.json({
            success: true,
            message: 'Laporan berhasil dihapus'
        });
        
    } catch (error) {
        console.error('Delete report error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menghapus laporan: ' + error.message
        });
    }
};

// Get statistics for dashboard
const getReportStatistics = async (req, res) => {
    try {
        // Total reports by type
        const [reportStats] = await db.query(`
            SELECT 
                report_type,
                COUNT(*) as count
            FROM health_reports
            GROUP BY report_type
        `);
        
        // Recent reports
        const [recentReports] = await db.query(`
            SELECT 
                hr.id,
                hr.report_type,
                hr.start_date,
                hr.end_date,
                hr.created_at,
                u.full_name as elderly_name,
                creator.full_name as created_by_name
            FROM health_reports hr
            LEFT JOIN users u ON hr.elderly_id = u.id
            JOIN users creator ON hr.created_by = creator.id
            ORDER BY hr.created_at DESC
            LIMIT 5
        `);
        
        res.json({
            success: true,
            data: {
                statistics: reportStats,
                recentReports
            }
        });
        
    } catch (error) {
        console.error('Get report statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil statistik laporan'
        });
    }
};

module.exports = {
    generateOverallReport,
    getSavedReports,
    getReportById,
    deleteReport,
    getReportStatistics
};