// routes/reports.js
const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');
const {
    generateOverallReport,
    getSavedReports,
    getReportById,
    deleteReport,
    getReportStatistics
} = require('../controllers/reportController');

// All report routes require authentication
router.use(authenticateToken);

// Generate overall elderly report (admin only)
router.post('/generate/overall', authorize('admin'), generateOverallReport);

// Get saved reports
router.get('/', authorize('admin', 'medical'), getSavedReports);

// Get report statistics
router.get('/statistics', authorize('admin'), getReportStatistics);

// Get specific report by ID
router.get('/:reportId', authorize('admin', 'medical'), getReportById);

// Delete report (admin only)
router.delete('/:reportId', authorize('admin'), deleteReport);

module.exports = router;