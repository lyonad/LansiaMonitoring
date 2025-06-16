// routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Validation middleware
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }
    next();
};

// Register route with validation
router.post('/register', [
    body('username')
        .isLength({ min: 3 })
        .withMessage('Username minimal 3 karakter')
        .matches(/^[A-Za-z0-9_]+$/)
        .withMessage('Username hanya boleh mengandung huruf, angka, dan underscore'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password minimal 6 karakter'),
    body('email')
        .isEmail()
        .withMessage('Email tidak valid'),
    body('fullName')
        .notEmpty()
        .withMessage('Nama lengkap harus diisi'),
    body('role')
        .isIn(['admin', 'family', 'medical', 'elderly'])
        .withMessage('Role tidak valid')
], validate, authController.register);

// Login route with validation
router.post('/login', [
    body('username')
        .notEmpty()
        .withMessage('Username harus diisi'),
    body('password')
        .notEmpty()
        .withMessage('Password harus diisi')
], validate, authController.login);

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/password', authenticateToken, [
    body('oldPassword')
        .notEmpty()
        .withMessage('Password lama harus diisi'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('Password baru minimal 6 karakter')
], validate, authController.updatePassword);
router.post('/logout', authenticateToken, authController.logout);

module.exports = router;