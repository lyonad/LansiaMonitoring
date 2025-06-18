// backend/app.js - Main server file with monitoring routes
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
const monitoringRoutes = require('./routes/monitoring'); // MONITORING ROUTE

const app = express();

// Middleware - Updated CORS for localhost
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // List of allowed origins
        const allowedOrigins = [
            'http://localhost',
            'http://localhost:80',
            'http://localhost:8080',
            'http://localhost:3000',
            'http://127.0.0.1'
        ];
        
        // Check if the origin is allowed
        if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('localhost')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test route
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'LansiaMonitoring API is running',
        version: '1.0.0'
    });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/monitoring', monitoringRoutes); // MONITORING ROUTE REGISTERED

// Log all registered routes (for debugging)
app._router.stack.forEach(function(r){
    if (r.route && r.route.path){
        console.log(`Route registered: ${r.route.path}`);
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan pada server',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    console.log('404 - Route not found:', req.method, req.url);
    res.status(404).json({
        success: false,
        message: 'Endpoint tidak ditemukan',
        path: req.url
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
    console.log(`🚀 LansiaMonitoring Backend Server`);
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

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;