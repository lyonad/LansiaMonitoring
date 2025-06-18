// controllers/monitoringController.js
const db = require('../config/database');

// Get monitoring dashboard data
const getMonitoringDashboard = async (req, res) => {
    try {
        // Get active alerts count by type
        const [alertCounts] = await db.query(`
            SELECT 
                alert_type,
                COUNT(*) as count
            FROM monitoring_alerts
            WHERE is_dismissed = FALSE
            GROUP BY alert_type
        `);

        // Get recent vital signs with threshold violations
        const [vitalViolations] = await db.query(`
            SELECT 
                vs.id,
                vs.elderly_id,
                u.full_name as elderly_name,
                vs.measurement_date,
                vs.blood_pressure_sys,
                vs.blood_pressure_dia,
                vs.heart_rate,
                vs.blood_sugar,
                vs.oxygen_saturation,
                vt.sys_min, vt.sys_max,
                vt.dia_min, vt.dia_max,
                vt.heart_rate_min, vt.heart_rate_max,
                vt.oxygen_min,
                CASE 
                    WHEN vs.blood_pressure_sys > vt.sys_max OR vs.blood_pressure_sys < vt.sys_min THEN 'critical'
                    WHEN vs.blood_pressure_dia > vt.dia_max OR vs.blood_pressure_dia < vt.dia_min THEN 'critical'
                    WHEN vs.heart_rate > vt.heart_rate_max OR vs.heart_rate < vt.heart_rate_min THEN 'high'
                    WHEN vs.oxygen_saturation < vt.oxygen_min THEN 'critical'
                    ELSE 'normal'
                END as status
            FROM vital_signs vs
            JOIN users u ON vs.elderly_id = u.id
            LEFT JOIN vital_thresholds vt ON vs.elderly_id = vt.elderly_id
            WHERE vs.measurement_date >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            ORDER BY vs.measurement_date DESC
            LIMIT 20
        `);

        // Get elderly with no recent vital signs (need attention)
        const [inactiveElderly] = await db.query(`
            SELECT 
                u.id,
                u.full_name,
                u.phone,
                MAX(vs.measurement_date) as last_measurement,
                DATEDIFF(NOW(), MAX(vs.measurement_date)) as days_since_last
            FROM users u
            LEFT JOIN vital_signs vs ON u.id = vs.elderly_id
            WHERE u.role = 'elderly' AND u.is_active = TRUE
            GROUP BY u.id
            HAVING days_since_last > 3 OR last_measurement IS NULL
            ORDER BY days_since_last DESC
        `);

        // Get medication compliance stats
        const [medicationStats] = await db.query(`
            SELECT 
                COUNT(DISTINCT m.elderly_id) as total_elderly_with_meds,
                COUNT(CASE WHEN ml.status = 'taken' THEN 1 END) as taken_count,
                COUNT(CASE WHEN ml.status = 'missed' THEN 1 END) as missed_count,
                COUNT(CASE WHEN ml.status = 'postponed' THEN 1 END) as postponed_count,
                ROUND(
                    COUNT(CASE WHEN ml.status = 'taken' THEN 1 END) * 100.0 / 
                    NULLIF(COUNT(*), 0), 2
                ) as compliance_rate
            FROM medicines m
            LEFT JOIN medicine_logs ml ON m.id = ml.medicine_id
            WHERE m.is_active = TRUE 
            AND DATE(ml.taken_at) = CURDATE()
        `);

        res.json({
            success: true,
            data: {
                alertCounts,
                vitalViolations,
                inactiveElderly,
                medicationStats: medicationStats[0]
            }
        });
    } catch (error) {
        console.error('Get monitoring dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data monitoring'
        });
    }
};

// Get all monitoring alerts with filters
const getMonitoringAlerts = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            alertType, 
            category,
            isDismissed,
            elderlyId,
            startDate,
            endDate 
        } = req.query;
        
        const offset = (page - 1) * limit;
        
        let query = `
            SELECT 
                ma.*,
                u.full_name as elderly_name,
                u.phone as elderly_phone,
                creator.full_name as created_by_name,
                dismisser.full_name as dismissed_by_name
            FROM monitoring_alerts ma
            JOIN users u ON ma.elderly_id = u.id
            JOIN users creator ON ma.created_by = creator.id
            LEFT JOIN users dismisser ON ma.dismissed_by = dismisser.id
            WHERE 1=1
        `;
        
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM monitoring_alerts ma
            WHERE 1=1
        `;
        
        const params = [];
        const countParams = [];
        
        // Add filters
        if (alertType) {
            query += ' AND ma.alert_type = ?';
            countQuery += ' AND ma.alert_type = ?';
            params.push(alertType);
            countParams.push(alertType);
        }
        
        if (category) {
            query += ' AND ma.category = ?';
            countQuery += ' AND ma.category = ?';
            params.push(category);
            countParams.push(category);
        }
        
        if (isDismissed !== undefined) {
            query += ' AND ma.is_dismissed = ?';
            countQuery += ' AND ma.is_dismissed = ?';
            params.push(isDismissed === 'true');
            countParams.push(isDismissed === 'true');
        }
        
        if (elderlyId) {
            query += ' AND ma.elderly_id = ?';
            countQuery += ' AND ma.elderly_id = ?';
            params.push(elderlyId);
            countParams.push(elderlyId);
        }
        
        if (startDate) {
            query += ' AND DATE(ma.created_at) >= ?';
            countQuery += ' AND DATE(ma.created_at) >= ?';
            params.push(startDate);
            countParams.push(startDate);
        }
        
        if (endDate) {
            query += ' AND DATE(ma.created_at) <= ?';
            countQuery += ' AND DATE(ma.created_at) <= ?';
            params.push(endDate);
            countParams.push(endDate);
        }
        
        // Add sorting and pagination
        query += ' ORDER BY ma.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        // Execute queries
        const [alerts] = await db.query(query, params);
        const [countResult] = await db.query(countQuery, countParams);
        const total = countResult[0].total;
        
        res.json({
            success: true,
            data: {
                alerts,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get monitoring alerts error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data alerts'
        });
    }
};

// Dismiss alert
const dismissAlert = async (req, res) => {
    try {
        const { alertId } = req.params;
        
        await db.query(
            `UPDATE monitoring_alerts 
             SET is_dismissed = TRUE, 
                 dismissed_by = ?, 
                 dismissed_at = NOW() 
             WHERE id = ?`,
            [req.user.id, alertId]
        );
        
        res.json({
            success: true,
            message: 'Alert berhasil di-dismiss'
        });
    } catch (error) {
        console.error('Dismiss alert error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal dismiss alert'
        });
    }
};

// Get vital signs trends
const getVitalSignsTrends = async (req, res) => {
    try {
        const { elderlyId, days = 7 } = req.query;
        
        let query = `
            SELECT 
                vs.elderly_id,
                u.full_name as elderly_name,
                DATE(vs.measurement_date) as date,
                AVG(vs.blood_pressure_sys) as avg_sys,
                AVG(vs.blood_pressure_dia) as avg_dia,
                AVG(vs.heart_rate) as avg_heart_rate,
                AVG(vs.blood_sugar) as avg_blood_sugar,
                AVG(vs.oxygen_saturation) as avg_oxygen
            FROM vital_signs vs
            JOIN users u ON vs.elderly_id = u.id
            WHERE vs.measurement_date >= DATE_SUB(NOW(), INTERVAL ? DAY)
        `;
        
        const params = [parseInt(days)];
        
        if (elderlyId) {
            query += ' AND vs.elderly_id = ?';
            params.push(elderlyId);
        }
        
        query += `
            GROUP BY vs.elderly_id, DATE(vs.measurement_date)
            ORDER BY vs.elderly_id, date DESC
        `;
        
        const [trends] = await db.query(query, params);
        
        // Group by elderly
        const groupedTrends = trends.reduce((acc, curr) => {
            if (!acc[curr.elderly_id]) {
                acc[curr.elderly_id] = {
                    elderly_id: curr.elderly_id,
                    elderly_name: curr.elderly_name,
                    data: []
                };
            }
            acc[curr.elderly_id].data.push({
                date: curr.date,
                avg_sys: parseFloat(curr.avg_sys),
                avg_dia: parseFloat(curr.avg_dia),
                avg_heart_rate: parseFloat(curr.avg_heart_rate),
                avg_blood_sugar: parseFloat(curr.avg_blood_sugar),
                avg_oxygen: parseFloat(curr.avg_oxygen)
            });
            return acc;
        }, {});
        
        res.json({
            success: true,
            data: Object.values(groupedTrends)
        });
    } catch (error) {
        console.error('Get vital signs trends error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data trend'
        });
    }
};

// Get real-time monitoring data
const getRealTimeData = async (req, res) => {
    try {
        // Get latest vital signs (last hour)
        const [latestVitals] = await db.query(`
            SELECT 
                vs.*,
                u.full_name as elderly_name,
                u.profile_image,
                recorder.full_name as recorded_by_name
            FROM vital_signs vs
            JOIN users u ON vs.elderly_id = u.id
            JOIN users recorder ON vs.recorded_by = recorder.id
            WHERE vs.measurement_date >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
            ORDER BY vs.measurement_date DESC
            LIMIT 10
        `);
        
        // Get latest activities
        const [latestActivities] = await db.query(`
            SELECT 
                a.*,
                u.full_name as elderly_name,
                recorder.full_name as recorded_by_name
            FROM activities a
            JOIN users u ON a.elderly_id = u.id
            LEFT JOIN users recorder ON a.recorded_by = recorder.id
            WHERE a.activity_date >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
            ORDER BY a.activity_date DESC
            LIMIT 10
        `);
        
        // Get latest medicine logs
        const [latestMedicineLogs] = await db.query(`
            SELECT 
                ml.*,
                m.medicine_name,
                m.dosage,
                u.full_name as elderly_name,
                marker.full_name as marked_by_name
            FROM medicine_logs ml
            JOIN medicines m ON ml.medicine_id = m.id
            JOIN users u ON m.elderly_id = u.id
            JOIN users marker ON ml.marked_by = marker.id
            WHERE ml.created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
            ORDER BY ml.created_at DESC
            LIMIT 10
        `);
        
        res.json({
            success: true,
            data: {
                latestVitals,
                latestActivities,
                latestMedicineLogs,
                timestamp: new Date()
            }
        });
    } catch (error) {
        console.error('Get real-time data error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data real-time'
        });
    }
};

// Create manual alert
const createAlert = async (req, res) => {
    try {
        const { elderlyId, alertType, category, message, requiresAction, actionDescription } = req.body;
        
        const [result] = await db.query(
            `INSERT INTO monitoring_alerts 
             (elderly_id, alert_type, category, message, requires_action, action_description, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [elderlyId, alertType, category, message, requiresAction || false, actionDescription || null, req.user.id]
        );
        
        // Send notification to family members
        const [familyMembers] = await db.query(`
            SELECT u.id 
            FROM users u
            JOIN family_elderly_relations fer ON u.id = fer.family_user_id
            WHERE fer.elderly_user_id = ?
        `, [elderlyId]);
        
        for (const family of familyMembers) {
            await db.query(
                `INSERT INTO notifications 
                 (user_id, type, title, message, priority, related_entity, entity_id) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [family.id, 'health_alert', 'Alert Kesehatan', message, alertType, 'monitoring_alerts', result.insertId]
            );
        }
        
        res.json({
            success: true,
            message: 'Alert berhasil dibuat',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('Create alert error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal membuat alert'
        });
    }
};

// Get monitoring summary for export
const getMonitoringSummary = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        // Validate dates
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Tanggal mulai dan akhir harus diisi'
            });
        }
        
        // Get summary data
        const [summary] = await db.query(`
            SELECT 
                COUNT(DISTINCT vs.elderly_id) as total_elderly_monitored,
                COUNT(vs.id) as total_vital_measurements,
                AVG(vs.blood_pressure_sys) as avg_sys_all,
                AVG(vs.blood_pressure_dia) as avg_dia_all,
                AVG(vs.heart_rate) as avg_heart_rate_all,
                AVG(vs.blood_sugar) as avg_blood_sugar_all
            FROM vital_signs vs
            WHERE DATE(vs.measurement_date) BETWEEN ? AND ?
        `, [startDate, endDate]);
        
        const [alertSummary] = await db.query(`
            SELECT 
                alert_type,
                category,
                COUNT(*) as count
            FROM monitoring_alerts
            WHERE DATE(created_at) BETWEEN ? AND ?
            GROUP BY alert_type, category
        `, [startDate, endDate]);
        
        const [complianceSummary] = await db.query(`
            SELECT 
                ml.status,
                COUNT(*) as count
            FROM medicine_logs ml
            JOIN medicines m ON ml.medicine_id = m.id
            WHERE DATE(ml.taken_at) BETWEEN ? AND ?
            GROUP BY ml.status
        `, [startDate, endDate]);
        
        res.json({
            success: true,
            data: {
                period: { startDate, endDate },
                vitalSummary: summary[0],
                alertSummary,
                complianceSummary
            }
        });
    } catch (error) {
        console.error('Get monitoring summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil summary monitoring'
        });
    }
};

module.exports = {
    getMonitoringDashboard,
    getMonitoringAlerts,
    dismissAlert,
    getVitalSignsTrends,
    getRealTimeData,
    createAlert,
    getMonitoringSummary
};