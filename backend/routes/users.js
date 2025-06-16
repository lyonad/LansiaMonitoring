// routes/users.js
const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');
const userController = require('../controllers/userController');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');

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

// Get all users (admin only)
router.get('/', authenticateToken, authorize('admin'), userController.getAllUsers);

// Get user statistics (admin only)
router.get('/statistics', authenticateToken, authorize('admin'), userController.getUserStatistics);

// Get single user by ID
router.get('/:id', authenticateToken, userController.getUserById);

// Create new user (admin only)
router.post('/', 
    authenticateToken, 
    authorize('admin'),
    [
        body('username').isLength({ min: 3 }).withMessage('Username minimal 3 karakter'),
        body('password').isLength({ min: 6 }).withMessage('Password minimal 6 karakter'),
        body('email').isEmail().withMessage('Email tidak valid'),
        body('fullName').notEmpty().withMessage('Nama lengkap harus diisi'),
        body('role').isIn(['admin', 'family', 'medical', 'elderly']).withMessage('Role tidak valid')
    ],
    validate,
    userController.createUser
);

// Update user (admin only)
router.put('/:id', 
    authenticateToken, 
    authorize('admin'),
    [
        body('email').optional().isEmail().withMessage('Email tidak valid'),
        body('role').optional().isIn(['admin', 'family', 'medical', 'elderly']).withMessage('Role tidak valid')
    ],
    validate,
    userController.updateUser
);

// Delete user (admin only)
router.delete('/:id', authenticateToken, authorize('admin'), userController.deleteUser);

// Reset password (admin only)
router.post('/:id/reset-password', 
    authenticateToken, 
    authorize('admin'),
    [
        body('newPassword').isLength({ min: 6 }).withMessage('Password minimal 6 karakter')
    ],
    validate,
    userController.resetPassword
);

// Link family to elderly (admin only)
router.post('/link-elderly', 
    authenticateToken, 
    authorize('admin'),
    [
        body('familyUserId').isInt().withMessage('Family user ID harus berupa angka'),
        body('elderlyUserId').isInt().withMessage('Elderly user ID harus berupa angka'),
        body('relationship').optional().isString()
    ],
    validate,
    userController.linkFamilyElderly
);

// Get emergency contacts for a user
router.get('/:userId/emergency-contacts', authenticateToken, userController.getEmergencyContacts);

// Get my elderly (for family users)
router.get('/my-elderly', authenticateToken, authorize('family'), async (req, res) => {
    try {
        const [elderly] = await db.query(
            `SELECT u.id, u.username, u.full_name, u.email, u.phone, fer.relationship
             FROM family_elderly_relations fer
             JOIN users u ON fer.elderly_user_id = u.id
             WHERE fer.family_user_id = ?`,
            [req.user.id]
        );
        
        res.json({
            success: true,
            data: elderly
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data lansia'
        });
    }
});

module.exports = router;