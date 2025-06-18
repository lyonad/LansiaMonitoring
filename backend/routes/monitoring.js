// routes/monitoring.js
const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');
const {
    getMonitoringDashboard,
    getMonitoringAlerts,
    dismissAlert,
    getVitalSignsTrends,
    getRealTimeData,
    createAlert,
    getMonitoringSummary
} = require('../controllers/monitoringController');

// All monitoring routes require authentication and admin/medical role
router.use(authenticateToken);

// Get monitoring dashboard data
router.get('/dashboard', authorize('admin', 'medical'), getMonitoringDashboard);

// Get monitoring alerts with filters
router.get('/alerts', authorize('admin', 'medical'), getMonitoringAlerts);

// Dismiss an alert
router.put('/alerts/:alertId/dismiss', authorize('admin', 'medical'), dismissAlert);

// Get vital signs trends
router.get('/trends/vitals', authorize('admin', 'medical'), getVitalSignsTrends);

// Get real-time monitoring data
router.get('/real-time', authorize('admin', 'medical'), getRealTimeData);

// Create manual alert
router.post('/alerts', authorize('admin', 'medical'), createAlert);

// Get monitoring summary for export
router.get('/summary', authorize('admin'), getMonitoringSummary);

module.exports = router;