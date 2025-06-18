// app.js - Main server file (Updated with monitoring routes)
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const medicineRoutes = require('./routes/medicines');
const healthRoutes = require('./routes/health');
const appointmentRoutes = require('./routes/appointments');
const chatRoutes = require('./routes/chats');
const reportRoutes = require('./routes/reports');
const notificationRoutes = require('./routes/notifications');
const monitoringRoutes = require('./routes/monitoring'); // NEW

// Import controllers jika perlu
const { sendMedicineReminders } = require('./controllers/notificationController');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/monitoring', monitoringRoutes); // NEW

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan pada server',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint tidak ditemukan'
    });
});

// Database connection test
const db = require('./config/database');
db.getConnection()
    .then(connection => {
        console.log('✓ Database connected successfully');
        connection.release();
    })
    .catch(err => {
        console.error('✗ Database connection failed:', err.message);
    });

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`🚀 HEALTHA Backend Server`);
    console.log(`========================================`);
    console.log(`✓ Server berjalan pada port ${PORT}`);
    console.log(`✓ API URL: http://localhost:${PORT}/api`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`========================================\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

// Schedule cron jobs for medicine reminders
const cron = require('node-cron');

// Run every hour to check medicine schedules - disabled for now
// Uncomment when notification system is ready
/*
cron.schedule('0 * * * *', async () => {
    console.log('Checking medicine reminders...');
    await sendMedicineReminders();
});
*/
