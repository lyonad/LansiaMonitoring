// routes/monitoring.js
const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');
const monitoringController = require('../controllers/monitoringController');

// Get elderly list
router.get('/elderly-list', 
    authenticateToken, 
    authorize('admin', 'medical'), 
    monitoringController.getElderlyList
);

// Get monitoring data for specific elderly
router.get('/elderly/:elderlyId', 
    authenticateToken, 
    authorize('admin', 'medical', 'family'), 
    monitoringController.getElderlyMonitoring
);

// Add health record
router.post('/elderly/:elderlyId/health',
    authenticateToken,
    authorize('admin', 'medical', 'family'),
    monitoringController.addHealthRecord
);

// Log medicine taken
router.post('/medicine/:medicineId/log',
    authenticateToken,
    authorize('admin', 'medical', 'family', 'elderly'),
    monitoringController.logMedicine
);

// Get health history for charts
router.get('/elderly/:elderlyId/health-history',
    authenticateToken,
    authorize('admin', 'medical', 'family'),
    monitoringController.getHealthHistory
);

// Get activity logs
router.get('/elderly/:elderlyId/activities',
    authenticateToken,
    authorize('admin', 'medical', 'family'),
    monitoringController.getActivityLogs
);

// Create alert
router.post('/alerts',
    authenticateToken,
    authorize('admin', 'medical'),
    monitoringController.createAlert
);

module.exports = router;