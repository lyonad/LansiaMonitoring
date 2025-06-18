// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

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
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Log activity
        await db.query(
            'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
            [user.id, 'LOGIN', 'User login', req.ip]
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

module.exports = {
    register,
    login,
    getProfile,
    updatePassword,
    logout,
    checkUsername,
    checkEmail
};