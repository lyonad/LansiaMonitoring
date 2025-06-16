// middleware/auth.js
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Verify JWT token
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Token tidak ditemukan'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database
        const [users] = await db.query(
            'SELECT id, username, email, full_name, role FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (users.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }

        req.user = users[0];
        next();
    } catch (error) {
        return res.status(403).json({
            success: false,
            message: 'Token tidak valid'
        });
    }
};

// Check user role
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses ke resource ini'
            });
        }

        next();
    };
};

// Check if user can access elderly data
const authorizeElderlyAccess = async (req, res, next) => {
    const elderlyId = req.params.elderlyId || req.body.elderlyId;
    
    if (!elderlyId) {
        return res.status(400).json({
            success: false,
            message: 'Elderly ID diperlukan'
        });
    }

    // Admin can access all
    if (req.user.role === 'admin') {
        return next();
    }

    // Elderly can only access their own data
    if (req.user.role === 'elderly' && req.user.id === parseInt(elderlyId)) {
        return next();
    }

    // Family members can access their elderly's data
    if (req.user.role === 'family') {
        const [relations] = await db.query(
            'SELECT * FROM family_elderly_relations WHERE family_user_id = ? AND elderly_user_id = ?',
            [req.user.id, elderlyId]
        );

        if (relations.length > 0) {
            return next();
        }
    }

    // Medical staff can access assigned elderly
    if (req.user.role === 'medical') {
        // Add logic for medical staff access
        return next();
    }

    return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki akses ke data ini'
    });
};

module.exports = {
    authenticateToken,
    authorize,
    authorizeElderlyAccess
};