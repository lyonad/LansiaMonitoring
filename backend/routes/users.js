// routes/users.js
const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/auth');
const userController = require('../controllers/userController');
const { body, query, validationResult } = require('express-validator');
const db = require('../config/database');

// Multer configuration - MUST BE AT THE TOP before routes
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/avatars/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + req.params.id + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Hanya file gambar yang diperbolehkan'));
        }
    }
});

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

// Get current user profile (any authenticated user)
router.get('/me', authenticateToken, userController.getMyProfile);

// Update current user profile
router.put('/me', 
    authenticateToken,
    [
        body('email').optional().isEmail().withMessage('Email tidak valid'),
        body('fullName').optional().notEmpty().withMessage('Nama lengkap tidak boleh kosong'),
        body('phone').optional().matches(/^(\+62|62|0)[0-9]{9,12}$/).withMessage('Format nomor telepon tidak valid'),
        body('dateOfBirth').optional().isISO8601().withMessage('Format tanggal tidak valid'),
        body('bloodType').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Golongan darah tidak valid')
    ],
    validate,
    userController.updateMyProfile
);

// User preferences
router.get('/preferences', authenticateToken, userController.getUserPreferences);

router.put('/preferences', 
    authenticateToken,
    [
        body('emailNotifications').optional().isBoolean(),
        body('smsNotifications').optional().isBoolean(),
        body('pushNotifications').optional().isBoolean(),
        body('theme').optional().isIn(['light', 'dark', 'auto']),
        body('language').optional().isIn(['id', 'en'])
    ],
    validate,
    userController.updateUserPreferences
);

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

// Export user data (GDPR compliance)
router.get('/me/export', authenticateToken, userController.exportMyData);

// Get single user by ID
router.get('/:id', authenticateToken, userController.getUserById);

// Get user statistics detailed
router.get('/:id/statistics', authenticateToken, userController.getUserStatisticsDetailed);

// Get user activities
router.get('/:id/activities', 
    authenticateToken,
    [
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 })
    ],
    validate,
    userController.getUserActivities
);

// Upload avatar - NOW upload IS DEFINED
router.post('/:id/avatar', 
    authenticateToken,
    upload.single('avatar'),
    userController.uploadAvatar
);

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

// Emergency contacts routes
router.get('/:userId/emergency-contacts', authenticateToken, userController.getEmergencyContacts);

router.post('/:userId/emergency-contacts', 
    authenticateToken,
    [
        body('contactName').notEmpty().withMessage('Nama kontak harus diisi'),
        body('contactPhone').matches(/^(\+62|62|0)[0-9]{9,12}$/).withMessage('Format nomor telepon tidak valid'),
        body('priority').optional().isInt({ min: 1, max: 10 })
    ],
    validate,
    userController.addEmergencyContact
);

router.put('/emergency-contacts/:id', 
    authenticateToken,
    [
        body('contactName').optional().notEmpty(),
        body('contactPhone').optional().matches(/^(\+62|62|0)[0-9]{9,12}$/),
        body('priority').optional().isInt({ min: 1, max: 10 })
    ],
    validate,
    userController.updateEmergencyContact
);

router.delete('/emergency-contacts/:id', authenticateToken, userController.deleteEmergencyContact);

module.exports = router;