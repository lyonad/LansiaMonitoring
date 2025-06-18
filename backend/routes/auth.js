// routes/auth.js - Complete version with all features
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
            errors: errors.array().map(err => ({
                field: err.param,
                message: err.msg
            }))
        });
    }
    next();
};

// Enhanced register route with role-based validation
router.post('/register', [
    // Common validations
    body('username')
        .isLength({ min: 3, max: 20 })
        .withMessage('Username harus 3-20 karakter')
        .matches(/^[A-Za-z0-9_]+$/)
        .withMessage('Username hanya boleh mengandung huruf, angka, dan underscore'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password minimal 8 karakter')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password harus mengandung huruf besar, huruf kecil, dan angka'),
    body('email')
        .isEmail()
        .withMessage('Email tidak valid')
        .normalizeEmail(),
    body('fullName')
        .notEmpty()
        .withMessage('Nama lengkap harus diisi')
        .isLength({ min: 3 })
        .withMessage('Nama lengkap minimal 3 karakter'),
    body('role')
        .isIn(['admin', 'family', 'medical', 'elderly'])
        .withMessage('Role tidak valid'),
    body('dateOfBirth')
        .optional({ checkFalsy: true })
        .isDate()
        .withMessage('Tanggal lahir tidak valid')
        .custom((value, { req }) => {
            if (!value) return true; // Skip if empty
            
            const birthDate = new Date(value);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            
            // Check if elderly role meets age requirement
            if (req.body.role === 'elderly' && age < 60) {
                throw new Error('Untuk role lansia, usia minimal adalah 60 tahun');
            }
            
            // General age validation
            if (age < 0 || age > 150) {
                throw new Error('Tanggal lahir tidak valid');
            }
            
            return true;
        }),
    body('phone')
        .optional({ checkFalsy: true })
        .matches(/^(\+62|62|0)8[1-9][0-9]{6,10}$/)
        .withMessage('Format nomor HP tidak valid'),
    body('bloodType')
        .optional({ checkFalsy: true })
        .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
        .withMessage('Golongan darah tidak valid'),
    
    // Optional fields without validation (just sanitization)
    body('address').optional({ checkFalsy: true }).trim(),
    body('medicalConditions').optional({ checkFalsy: true }).trim(),
    body('allergies').optional({ checkFalsy: true }).trim(),
    body('preferredHospital').optional({ checkFalsy: true }).trim(),
    body('emergencyContactName').optional({ checkFalsy: true }).trim(),
    body('emergencyContactPhone')
        .optional({ checkFalsy: true })
        .custom((value) => {
            if (!value) return true;
            return /^(\+62|62|0)8[1-9][0-9]{6,10}$/.test(value);
        })
        .withMessage('Format nomor kontak darurat tidak valid'),
    body('emergencyContactRelationship').optional({ checkFalsy: true }).trim(),
    
    // Medical staff specific fields
    body('licenseNumber').optional({ checkFalsy: true }).trim(),
    body('specialization').optional({ checkFalsy: true }).trim(),
    body('workplace').optional({ checkFalsy: true }).trim()
], validate, authController.register);

// Login route with validation
router.post('/login', [
    body('username')
        .notEmpty()
        .withMessage('Username atau email harus diisi'),
    body('password')
        .notEmpty()
        .withMessage('Password harus diisi')
], validate, authController.login);

// Check username availability
router.get('/check-username/:username', authController.checkUsername);

// Check email availability  
router.get('/check-email/:email', authController.checkEmail);

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile);

// Update password with enhanced validation
router.put('/password', authenticateToken, [
    body('oldPassword')
        .notEmpty()
        .withMessage('Password lama harus diisi'),
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('Password baru minimal 8 karakter')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password harus mengandung huruf besar, huruf kecil, dan angka')
        .custom((value, { req }) => {
            if (value === req.body.oldPassword) {
                throw new Error('Password baru tidak boleh sama dengan password lama');
            }
            return true;
        })
], validate, authController.updatePassword);

// Logout
router.post('/logout', authenticateToken, authController.logout);

// Resend verification email (for future implementation)
router.post('/resend-verification', [
    body('email')
        .isEmail()
        .withMessage('Email tidak valid')
], validate, async (req, res) => {
    // TODO: Implement email verification
    res.json({
        success: true,
        message: 'Email verifikasi akan segera dikirim'
    });
});

// Request password reset (for future implementation)
router.post('/forgot-password', [
    body('email')
        .isEmail()
        .withMessage('Email tidak valid')
], validate, async (req, res) => {
    // TODO: Implement password reset
    res.json({
        success: true,
        message: 'Link reset password akan dikirim ke email Anda'
    });
});

router.post('/change-password',
    authenticateToken,
    [
        body('oldPassword').notEmpty().withMessage('Password lama harus diisi'),
        body('newPassword')
            .isLength({ min: 8 }).withMessage('Password minimal 8 karakter')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .withMessage('Password harus mengandung huruf besar, huruf kecil, angka, dan karakter spesial')
    ],
    validate,
    authController.changePassword
);

// Session management
router.get('/sessions', authenticateToken, authController.getSessions);
router.delete('/sessions/:sessionId', authenticateToken, authController.revokeSession);
router.post('/sessions/revoke-all', authenticateToken, authController.revokeAllSessions);

// Two-factor authentication
router.post('/2fa/setup', authenticateToken, authController.setup2FA);
router.post('/2fa/verify', authenticateToken, authController.verify2FA);
router.post('/2fa/disable', authenticateToken, authController.disable2FA);

// Refresh token
router.post('/refresh', authController.refreshToken);

// Password reset
router.post('/forgot-password', 
    [
        body('email').isEmail().withMessage('Email tidak valid')
    ],
    validate,
    authController.requestPasswordReset
);

router.post('/reset-password',
    [
        body('token').notEmpty().withMessage('Token diperlukan'),
        body('password')
            .isLength({ min: 8 }).withMessage('Password minimal 8 karakter')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .withMessage('Password harus mengandung huruf besar, huruf kecil, angka, dan karakter spesial')
    ],
    validate,
    authController.resetPasswordWithToken
);

// Verify email
router.post('/verify-email',
    [
        body('token').notEmpty().withMessage('Token verifikasi diperlukan')
    ],
    validate,
    authController.verifyEmail
);

router.post('/resend-verification', 
    authenticateToken, 
    authController.resendVerificationEmail
);

module.exports = router;