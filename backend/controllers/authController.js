// controllers/authController.js - Temporary version without 2FA dependencies
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Comment out these for now
// const speakeasy = require('speakeasy');
// const QRCode = require('qrcode');
const crypto = require('crypto');

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;

// Register new user
const register = async (req, res) => {
    try {
        const { username, password, email, fullName, role, phone, address, dateOfBirth } = req.body;

        // Validate input
        if (!username || !password || !email || !fullName || !role) {
            return res.status(400).json({
                success: false,
                message: 'Semua field wajib harus diisi'
            });
        }

        // Check if user already exists
        const [existingUsers] = await db.query(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Username atau email sudah terdaftar'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert new user
        const [result] = await db.query(
            `INSERT INTO users (username, password, email, full_name, role, phone, address, date_of_birth) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [username, hashedPassword, email, fullName, role, phone || null, address || null, dateOfBirth || null]
        );

        // Log activity
        await db.query(
            'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
            [result.insertId, 'REGISTER', 'User baru terdaftar', req.ip]
        );

        res.status(201).json({
            success: true,
            message: 'Registrasi berhasil',
            data: {
                id: result.insertId,
                username,
                email,
                fullName,
                role
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat registrasi'
        });
    }
};

// Login user
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username dan password harus diisi'
            });
        }

        // Get user from database
        const [users] = await db.query(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [username, username]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Username atau password salah'
            });
        }

        const user = users[0];

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Username atau password salah'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Log activity
        await db.query(
            'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
            [user.id, 'LOGIN', 'User login', req.ip]
        );

        // Update last login
        await db.query(
            'UPDATE users SET last_login = NOW() WHERE id = ?',
            [user.id]
        );

        // Remove password from response
        delete user.password;

        res.json({
            success: true,
            message: 'Login berhasil',
            data: {
                user,
                token
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat login'
        });
    }
};

// Get current user profile
const getProfile = async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT id, username, email, full_name, role, phone, address, date_of_birth, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }

        res.json({
            success: true,
            data: users[0]
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat mengambil profil'
        });
    }
};

// Update password
const updatePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Password lama dan baru harus diisi'
            });
        }

        // Get current password hash
        const [users] = await db.query(
            'SELECT password FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }

        // Verify old password
        const isPasswordValid = await bcrypt.compare(oldPassword, users[0].password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Password lama salah'
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        await db.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, req.user.id]
        );

        // Log activity
        await db.query(
            'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
            [req.user.id, 'UPDATE_PASSWORD', 'Password diubah', req.ip]
        );

        res.json({
            success: true,
            message: 'Password berhasil diubah'
        });
    } catch (error) {
        console.error('Update password error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat mengubah password'
        });
    }
};

// Logout (log activity only, token invalidation handled client-side)
const logout = async (req, res) => {
    try {
        // Log activity
        await db.query(
            'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
            [req.user.id, 'LOGOUT', 'User logout', req.ip]
        );

        res.json({
            success: true,
            message: 'Logout berhasil'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat logout'
        });
    }
};

// Check if username is available
const checkUsername = async (req, res) => {
    try {
        const username = req.params.username;
        
        const [users] = await db.query(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );
        
        res.json({
            success: true,
            isAvailable: users.length === 0
        });
    } catch (error) {
        console.error('Check username error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat memeriksa username'
        });
    }
};

// Check if email is available
const checkEmail = async (req, res) => {
    try {
        const email = req.params.email;
        
        const [users] = await db.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );
        
        res.json({
            success: true,
            isAvailable: users.length === 0
        });
    } catch (error) {
        console.error('Check email error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat memeriksa email'
        });
    }
};

// Change password (for authenticated users)
const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.user.id;
        
        // Get current password hash
        const [users] = await db.query(
            'SELECT password FROM users WHERE id = ?',
            [userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }
        
        // Verify old password
        const isPasswordValid = await bcrypt.compare(oldPassword, users[0].password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Password lama salah'
            });
        }
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        
        // Update password
        await db.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, userId]
        );
        
        // Log activity
        await db.query(
            'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
            [userId, 'CHANGE_PASSWORD', 'Password diubah', req.ip]
        );
        
        res.json({
            success: true,
            message: 'Password berhasil diubah'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat mengubah password'
        });
    }
};

// Placeholder functions for 2FA features (to be implemented later)
const getSessions = async (req, res) => {
    res.json({
        success: true,
        data: []
    });
};

const revokeSession = async (req, res) => {
    res.json({
        success: true,
        message: 'Fitur akan segera tersedia'
    });
};

const revokeAllSessions = async (req, res) => {
    res.json({
        success: true,
        message: 'Fitur akan segera tersedia'
    });
};

const setup2FA = async (req, res) => {
    res.status(501).json({
        success: false,
        message: '2FA belum diimplementasikan. Silakan install module speakeasy dan qrcode terlebih dahulu.'
    });
};

const verify2FA = async (req, res) => {
    res.status(501).json({
        success: false,
        message: '2FA belum diimplementasikan'
    });
};

const disable2FA = async (req, res) => {
    res.status(501).json({
        success: false,
        message: '2FA belum diimplementasikan'
    });
};

const refreshToken = async (req, res) => {
    // Simple implementation without refresh token table
    const { token } = req.body;
    
    if (!token) {
        return res.status(400).json({
            success: false,
            message: 'Token diperlukan'
        });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Generate new token
        const newToken = jwt.sign(
            { userId: decoded.userId, username: decoded.username, role: decoded.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            data: {
                token: newToken
            }
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Token tidak valid'
        });
    }
};

const requestPasswordReset = async (req, res) => {
    res.json({
        success: true,
        message: 'Jika email terdaftar, kami akan mengirim link reset password'
    });
};

const resetPasswordWithToken = async (req, res) => {
    res.status(501).json({
        success: false,
        message: 'Fitur reset password akan segera tersedia'
    });
};

const verifyEmail = async (req, res) => {
    res.status(501).json({
        success: false,
        message: 'Fitur verifikasi email akan segera tersedia'
    });
};

const resendVerificationEmail = async (req, res) => {
    res.status(501).json({
        success: false,
        message: 'Fitur verifikasi email akan segera tersedia'
    });
};

module.exports = {
    register,
    login,
    getProfile,
    updatePassword,
    logout,
    checkUsername,
    checkEmail,
    changePassword,
    getSessions,
    revokeSession,
    revokeAllSessions,
    setup2FA,
    verify2FA,
    disable2FA,
    refreshToken,
    requestPasswordReset,
    resetPasswordWithToken,
    verifyEmail,
    resendVerificationEmail
};