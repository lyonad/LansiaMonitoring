// controllers/monitoringController.js
const db = require('../config/database');

// Get elderly list for monitoring
const getElderlyList = async (req, res) => {
    try {
        console.log('Getting elderly list...'); // Debug log
        
        // Query yang lebih sederhana untuk menghindari masalah GROUP BY
        const [elderly] = await db.query(`
            SELECT DISTINCT
                u.id,
                u.full_name,
                u.phone,
                u.date_of_birth,
                u.address,
                (SELECT COUNT(*) FROM family_elderly_relations WHERE elderly_user_id = u.id) as family_count,
                (SELECT MAX(created_at) FROM vital_signs WHERE elderly_id = u.id) as last_vitals_check,
                (SELECT MAX(recorded_at) FROM health_records WHERE user_id = u.id) as last_health_check
            FROM users u
            WHERE u.role = 'elderly'
            ORDER BY u.full_name
        `);
        
        console.log(`Found ${elderly.length} elderly users`); // Debug log

        // Format last vitals check - use either vital_signs or health_records
        const formattedElderly = elderly.map(e => {
            let lastVitals = 'Belum ada';
            const lastCheck = e.last_vitals_check || e.last_health_check;
            
            if (lastCheck) {
                const checkDate = new Date(lastCheck);
                const now = new Date();
                const diffMs = now - checkDate;
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                
                if (diffHours < 1) {
                    lastVitals = 'Kurang dari 1 jam lalu';
                } else if (diffHours < 24) {
                    lastVitals = `${diffHours} jam lalu`;
                } else {
                    const diffDays = Math.floor(diffHours / 24);
                    lastVitals = `${diffDays} hari lalu`;
                }
            }

            // Calculate age
            let age = null;
            if (e.date_of_birth) {
                const birthDate = new Date(e.date_of_birth);
                const today = new Date();
                age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }
            }

            return {
                ...e,
                age,
                last_vitals: lastVitals
            };
        });

        res.json({
            success: true,
            data: formattedElderly
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

        // Calculate age
        let age = null;
        if (elderly.date_of_birth) {
            const birthDate = new Date(elderly.date_of_birth);
            const today = new Date();
            age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
        }

        // Get latest vital signs from either vital_signs or health_records
        const [vitalsFromVitalSigns] = await db.query(`
            SELECT * FROM vital_signs 
            WHERE elderly_id = ? 
            ORDER BY measurement_date DESC 
            LIMIT 1
        `, [elderlyId]);

        const [vitalsFromHealthRecords] = await db.query(`
            SELECT 
                blood_pressure_systolic as blood_pressure_sys,
                blood_pressure_diastolic as blood_pressure_dia,
                heart_rate,
                blood_sugar_level as blood_sugar,
                temperature,
                weight,
                recorded_at as measurement_date
            FROM health_records 
            WHERE user_id = ? 
            ORDER BY recorded_at DESC 
            LIMIT 1
        `, [elderlyId]);

        // Use whichever is more recent
        let vitals = null;
        if (vitalsFromVitalSigns[0] && vitalsFromHealthRecords[0]) {
            const vsDate = new Date(vitalsFromVitalSigns[0].measurement_date);
            const hrDate = new Date(vitalsFromHealthRecords[0].measurement_date);
            vitals = vsDate > hrDate ? vitalsFromVitalSigns[0] : vitalsFromHealthRecords[0];
        } else {
            vitals = vitalsFromVitalSigns[0] || vitalsFromHealthRecords[0];
        }

        // Get today's medications from both tables
        const [medicationsFromMonitoring] = await db.query(`
            SELECT 
                mm.id,
                mm.medication_name,
                mm.dose,
                mm.frequency,
                mm.times,
                mm.notes,
                CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM medication_monitoring_logs mml 
                        WHERE mml.medication_id = mm.id 
                        AND DATE(mml.taken_at) = CURDATE()
                    ) THEN 'taken'
                    ELSE 'pending'
                END as status
            FROM medications_monitoring mm
            WHERE mm.elderly_id = ? AND mm.is_active = TRUE
        `, [elderlyId]);

        const [medicationsFromMedicines] = await db.query(`
            SELECT 
                m.id,
                m.medicine_name as medication_name,
                m.dosage as dose,
                m.frequency,
                TIME_FORMAT(m.time_schedule, '%H:%i') as times,
                m.notes,
                CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM medicine_logs ml 
                        WHERE ml.medicine_id = m.id 
                        AND DATE(ml.taken_at) = CURDATE()
                    ) THEN 'taken'
                    ELSE 'pending'
                END as status
            FROM medicines m
            WHERE m.user_id = ? 
            AND m.is_active = TRUE
            AND (m.end_date IS NULL OR m.end_date >= CURDATE())
        `, [elderlyId]);

        // Combine medications from both tables
        const medications = [...medicationsFromMonitoring, ...medicationsFromMedicines];

        // Get today's activities
        const [activities] = await db.query(`
            SELECT 
                activity_type,
                activity_date,
                value,
                unit,
                description
            FROM activities
            WHERE elderly_id = ? 
            AND DATE(activity_date) = CURDATE()
            ORDER BY activity_date DESC
        `, [elderlyId]);

        // Get alerts
        const [alerts] = await db.query(`
            SELECT 
                ma.*,
                u.full_name as created_by_name
            FROM monitoring_alerts ma
            JOIN users u ON ma.created_by = u.id
            WHERE ma.elderly_id = ? 
            ORDER BY ma.created_at DESC
            LIMIT 10
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

        // Get vital signs history for chart (last 7 days) from both tables
        const [vitalHistoryVS] = await db.query(`
            SELECT 
                DATE(measurement_date) as date,
                AVG(blood_pressure_sys) as avg_sys,
                AVG(blood_pressure_dia) as avg_dia,
                AVG(heart_rate) as avg_hr,
                AVG(blood_sugar) as avg_bs
            FROM vital_signs
            WHERE elderly_id = ? 
            AND measurement_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(measurement_date)
        `, [elderlyId]);

        const [vitalHistoryHR] = await db.query(`
            SELECT 
                DATE(recorded_at) as date,
                AVG(blood_pressure_systolic) as avg_sys,
                AVG(blood_pressure_diastolic) as avg_dia,
                AVG(heart_rate) as avg_hr,
                AVG(blood_sugar_level) as avg_bs
            FROM health_records
            WHERE user_id = ? 
            AND recorded_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(recorded_at)
        `, [elderlyId]);

        // Combine and sort by date
        const vitalHistoryMap = new Map();
        
        [...vitalHistoryVS, ...vitalHistoryHR].forEach(record => {
            const dateStr = record.date;
            if (!vitalHistoryMap.has(dateStr) || vitalHistoryMap.get(dateStr).avg_sys === null) {
                vitalHistoryMap.set(dateStr, record);
            }
        });

        const vitalHistory = Array.from(vitalHistoryMap.values())
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        // Format response
        const response = {
            elderly: {
                id: elderly.id,
                full_name: elderly.full_name,
                age: age,
                phone: elderly.phone,
                address: elderly.address
            },
            vitals: vitals || {
                blood_pressure_sys: null,
                blood_pressure_dia: null,
                heart_rate: null,
                blood_sugar: null,
                temperature: null,
                weight: null
            },
            medications: medications.map(med => ({
                id: med.id,
                name: med.medication_name,
                dose: med.dose,
                frequency: med.frequency,
                time: med.times,
                status: med.status,
                notes: med.notes
            })),
            activities: activities.map(act => ({
                time: new Date(act.activity_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                type: act.activity_type,
                value: `${act.value} ${act.unit}`,
                description: act.description
            })),
            alerts: alerts.map(alert => ({
                id: alert.id,
                type: alert.alert_type,
                message: alert.message,
                created_at: getRelativeTime(alert.created_at),
                created_by: alert.created_by_name,
                is_dismissed: alert.is_dismissed
            })),
            family_contacts: familyContacts,
            vital_history: vitalHistory
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

// Add vital signs
const addVitalSigns = async (req, res) => {
    try {
        const { elderlyId } = req.params;
        const {
            blood_pressure_sys,
            blood_pressure_dia,
            heart_rate,
            blood_sugar,
            temperature,
            weight,
            notes
        } = req.body;

        // Validate elderly exists
        const [elderly] = await db.query(
            'SELECT id FROM users WHERE id = ? AND role = "elderly"',
            [elderlyId]
        );

        if (elderly.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lansia tidak ditemukan'
            });
        }

        // Insert vital signs
        const [result] = await db.query(`
            INSERT INTO vital_signs 
            (elderly_id, measurement_date, blood_pressure_sys, blood_pressure_dia, 
             heart_rate, blood_sugar, temperature, weight, notes, recorded_by)
            VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            elderlyId,
            blood_pressure_sys,
            blood_pressure_dia,
            heart_rate,
            blood_sugar || null,
            temperature || null,
            weight || null,
            notes || null,
            req.user.id
        ]);

        // Check for abnormal values and create alerts
        const alerts = [];
        
        if (blood_pressure_sys > 140 || blood_pressure_dia > 90) {
            alerts.push({
                type: 'high',
                message: `Tekanan darah tinggi terdeteksi: ${blood_pressure_sys}/${blood_pressure_dia} mmHg`
            });
        }
        
        if (blood_sugar && blood_sugar > 125) {
            alerts.push({
                type: 'high',
                message: `Gula darah tinggi terdeteksi: ${blood_sugar} mg/dL`
            });
        }
        
        if (heart_rate && (heart_rate < 60 || heart_rate > 100)) {
            alerts.push({
                type: 'medium',
                message: `Detak jantung abnormal: ${heart_rate} bpm`
            });
        }

        // Create alerts if any
        for (const alert of alerts) {
            await db.query(`
                INSERT INTO monitoring_alerts (elderly_id, alert_type, message, created_by)
                VALUES (?, ?, ?, ?)
            `, [elderlyId, alert.type, alert.message, req.user.id]);
        }

        // Also insert into health_records for compatibility
        await db.query(`
            INSERT INTO health_records 
            (user_id, blood_pressure_systolic, blood_pressure_diastolic, 
             heart_rate, blood_sugar_level, temperature, weight, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            elderlyId,
            blood_pressure_sys,
            blood_pressure_dia,
            heart_rate || null,
            blood_sugar || null,
            temperature || null,
            weight || null,
            notes || null
        ]);

        res.json({
            success: true,
            message: 'Vital signs berhasil dicatat',
            data: {
                id: result.insertId,
                alerts_created: alerts.length
            }
        });
    } catch (error) {
        console.error('Error adding vital signs:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mencatat vital signs'
        });
    }
};

// Add medication log
const addMedicationLog = async (req, res) => {
    try {
        const { medicationId } = req.params;
        const { notes } = req.body;

        // Check if medication exists
        const [medication] = await db.query(
            'SELECT * FROM medications_monitoring WHERE id = ?',
            [medicationId]
        );

        if (medication.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Obat tidak ditemukan'
            });
        }

        // Add log
        await db.query(`
            INSERT INTO medication_monitoring_logs (medication_id, taken_at, marked_by, notes)
            VALUES (?, NOW(), ?, ?)
        `, [medicationId, req.user.id, notes || null]);

        res.json({
            success: true,
            message: 'Log obat berhasil dicatat'
        });
    } catch (error) {
        console.error('Error adding medication log:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mencatat log obat'
        });
    }
};

// Add activity
const addActivity = async (req, res) => {
    try {
        const { elderlyId } = req.params;
        const { activity_type, value, unit, description } = req.body;

        // Validate elderly exists
        const [elderly] = await db.query(
            'SELECT id FROM users WHERE id = ? AND role = "elderly"',
            [elderlyId]
        );

        if (elderly.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lansia tidak ditemukan'
            });
        }

        // Insert activity
        await db.query(`
            INSERT INTO activities (elderly_id, activity_type, activity_date, value, unit, description, recorded_by)
            VALUES (?, ?, NOW(), ?, ?, ?, ?)
        `, [
            elderlyId,
            activity_type,
            value,
            unit,
            description || null,
            req.user.id
        ]);

        res.json({
            success: true,
            message: 'Aktivitas berhasil dicatat'
        });
    } catch (error) {
        console.error('Error adding activity:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mencatat aktivitas'
        });
    }
};

// Add alert
const addAlert = async (req, res) => {
    try {
        const { elderly_id, alert_type, message } = req.body;

        // Validate elderly exists
        const [elderly] = await db.query(
            'SELECT id FROM users WHERE id = ? AND role = "elderly"',
            [elderly_id]
        );

        if (elderly.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lansia tidak ditemukan'
            });
        }

        // Insert alert
        await db.query(`
            INSERT INTO monitoring_alerts (elderly_id, alert_type, message, created_by)
            VALUES (?, ?, ?, ?)
        `, [elderly_id, alert_type, message, req.user.id]);

        // Create notification for family members
        const [familyMembers] = await db.query(`
            SELECT family_user_id FROM family_elderly_relations
            WHERE elderly_user_id = ?
        `, [elderly_id]);

        for (const family of familyMembers) {
            await db.query(`
                INSERT INTO notifications (user_id, type, title, message)
                VALUES (?, 'monitoring_alert', 'Alert Monitoring', ?)
            `, [
                family.family_user_id,
                `Alert ${alert_type} untuk ${elderly[0].full_name}: ${message}`
            ]);
        }

        res.json({
            success: true,
            message: 'Alert berhasil ditambahkan'
        });
    } catch (error) {
        console.error('Error adding alert:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menambahkan alert'
        });
    }
};

// Dismiss alert
const dismissAlert = async (req, res) => {
    try {
        const { alertId } = req.params;

        await db.query(`
            UPDATE monitoring_alerts 
            SET is_dismissed = TRUE, dismissed_by = ?, dismissed_at = NOW()
            WHERE id = ?
        `, [req.user.id, alertId]);

        res.json({
            success: true,
            message: 'Alert berhasil di-dismiss'
        });
    } catch (error) {
        console.error('Error dismissing alert:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal dismiss alert'
        });
    }
};

// Get monitoring summary (for dashboard)
const getMonitoringSummary = async (req, res) => {
    try {
        // Get total elderly with critical conditions
        const [criticalCount] = await db.query(`
            SELECT COUNT(DISTINCT elderly_id) as count
            FROM monitoring_alerts
            WHERE alert_type = 'high' 
            AND is_dismissed = FALSE
            AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        `);

        // Get elderly without recent checkups (>3 days)
        const [noRecentCheckup] = await db.query(`
            SELECT COUNT(*) as count
            FROM users u
            WHERE u.role = 'elderly'
            AND NOT EXISTS (
                SELECT 1 FROM vital_signs vs
                WHERE vs.elderly_id = u.id
                AND vs.measurement_date >= DATE_SUB(NOW(), INTERVAL 3 DAY)
            )
        `);

        // Get medication adherence rate (last 7 days)
        const [medicationStats] = await db.query(`
            SELECT 
                COUNT(DISTINCT mm.id) as total_medications,
                COUNT(DISTINCT mml.medication_id) as taken_medications
            FROM medications_monitoring mm
            LEFT JOIN medication_monitoring_logs mml ON mm.id = mml.medication_id
                AND mml.taken_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            WHERE mm.is_active = TRUE
        `);

        const adherenceRate = medicationStats[0].total_medications > 0
            ? Math.round((medicationStats[0].taken_medications / medicationStats[0].total_medications) * 100)
            : 0;

        res.json({
            success: true,
            data: {
                critical_elderly: criticalCount[0].count,
                no_recent_checkup: noRecentCheckup[0].count,
                medication_adherence: adherenceRate,
                alerts_today: await getAlertsToday()
            }
        });
    } catch (error) {
        console.error('Error getting monitoring summary:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil summary monitoring'
        });
    }
};

// Helper function to get alerts count today
async function getAlertsToday() {
    const [result] = await db.query(`
        SELECT COUNT(*) as count
        FROM monitoring_alerts
        WHERE DATE(created_at) = CURDATE()
    `);
    return result[0].count;
}

// Helper function to format relative time
function getRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
        return `${diffMins} menit lalu`;
    } else if (diffHours < 24) {
        return `${diffHours} jam lalu`;
    } else if (diffDays < 7) {
        return `${diffDays} hari lalu`;
    } else {
        return date.toLocaleDateString('id-ID');
    }
}

module.exports = {
    getElderlyList,
    getElderlyMonitoring,
    addVitalSigns,
    addMedicationLog,
    addActivity,
    addAlert,
    dismissAlert,
    getMonitoringSummary
};