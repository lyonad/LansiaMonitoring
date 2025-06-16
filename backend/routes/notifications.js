// routes/notifications.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

// Get user notifications
router.get('/', authenticateToken, notificationController.getUserNotifications);

// Get unread count
router.get('/unread-count', authenticateToken, notificationController.getUnreadCount);

// Mark notification as read
router.put('/:notificationId/read', authenticateToken, notificationController.markAsRead);

// Mark all as read
router.put('/read-all', authenticateToken, notificationController.markAllAsRead);

module.exports = router;