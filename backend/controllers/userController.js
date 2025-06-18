// controllers/userController.js
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const path = require('path'); // ADD THIS LINE - Required for uploadAvatar
const fs = require('fs'); // ADD THIS LINE - Required for file operations

// Get all users with pagination and filters
const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', role = '' } = req.query;
        const offset = (page - 1) * limit;
        
        let query = 'SELECT id, username, email, full_name, role, phone, created_at FROM users WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
        const params = [];
        const countParams = [];
        
        // Add search filter with proper escaping
        if (search) {
            query += ' AND (username LIKE ? OR email LIKE ? OR full_name LIKE ?)';
            countQuery += ' AND (username LIKE ? OR email LIKE ? OR full_name LIKE ?)';
            const searchParam = `%${search.replace(/[%_]/g, '\\$&')}%`; // Escape special characters
            params.push(searchParam, searchParam, searchParam);
            countParams.push(searchParam, searchParam, searchParam);
        }
        
        // Add role filter
        if (role && ['admin', 'family', 'elderly', 'medical'].includes(role)) {
            query += ' AND role = ?';
            countQuery += ' AND role = ?';
            params.push(role);
            countParams.push(role);
        }
        
        // Add pagination
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        // Execute queries
        const [users] = await db.query(query, params);
        const [countResult] = await db.query(countQuery, countParams);
        const total = countResult[0].total;
        
        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data user'
        });
    }
};

// Get single user by ID
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID
        const userId = parseInt(id);
        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: 'ID user tidak valid'
            });
        }
        
        const [users] = await db.query(
            `SELECT id, username, email, full_name, role, phone, address, 
                    date_of_birth, blood_type, medical_conditions, allergies,
                    profile_image, created_at, last_login 
             FROM users WHERE id = ?`,
            [userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }
        
        // Get emergency contacts if user is elderly
        let emergencyContacts = [];
        if (users[0].role === 'elderly') {
            const [contacts] = await db.query(
                'SELECT * FROM emergency_contacts WHERE user_id = ? ORDER BY priority',
                [userId]
            );
            emergencyContacts = contacts;
        }
        
        // Get family relations
        let familyRelations = [];
        if (users[0].role === 'family') {
            const [relations] = await db.query(
                `SELECT u.id, u.username, u.full_name, u.email, fer.relationship 
                 FROM family_elderly_relations fer
                 JOIN users u ON fer.elderly_user_id = u.id
                 WHERE fer.family_user_id = ?`,
                [userId]
            );
            familyRelations = relations;
        } else if (users[0].role === 'elderly') {
            const [relations] = await db.query(
                `SELECT u.id, u.username, u.full_name, u.email, fer.relationship 
                 FROM family_elderly_relations fer
                 JOIN users u ON fer.family_user_id = u.id
                 WHERE fer.elderly_user_id = ?`,
                [userId]
            );
            familyRelations = relations;
        }
        
        res.json({
            success: true,
            data: {
                ...users[0],
                emergencyContacts,
                familyRelations
            }
        });
    } catch (error) {
        console.error('Get user by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data user'
        });
    }
};

// Create new user
const createUser = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        const { username, password, email, fullName, role, phone, address, dateOfBirth } = req.body;
        
        // Validate required fields
        if (!username || !password || !email || !fullName || !role) {
            return res.status(400).json({
                success: false,
                message: 'Semua field wajib harus diisi'
            });
        }
        
        // Start transaction
        await connection.beginTransaction();
        
        // Check if user already exists
        const [existingUsers] = await connection.query(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );
        
        if (existingUsers.length > 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Username atau email sudah terdaftar'
            });
        }
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Insert new user
        const [result] = await connection.query(
            `INSERT INTO users (username, password, email, full_name, role, phone, address, date_of_birth) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [username, hashedPassword, email, fullName, role, phone || null, address || null, dateOfBirth || null]
        );
        
        // Create default user settings
        await connection.query(
            'INSERT INTO user_settings (user_id) VALUES (?)',
            [result.insertId]
        );
        
        // Log activity
        await connection.query(
            'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
            [req.user.id, 'CREATE_USER', `Admin membuat user baru: ${username}`, req.ip]
        );
        
        // Commit transaction
        await connection.commit();
        
        res.status(201).json({
            success: true,
            message: 'User berhasil dibuat',
            data: {
                id: result.insertId,
                username,
                email,
                fullName,
                role
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal membuat user baru'
        });
    } finally {
        connection.release();
    }
};

// Update user
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, fullName, role, phone, address, dateOfBirth } = req.body;
        
        // Validate ID
        const userId = parseInt(id);
        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: 'ID user tidak valid'
            });
        }
        
        // Check if user exists
        const [users] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }
        
        // Check if username/email already taken by another user
        if (username || email) {
            const [conflicts] = await db.query(
                'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?',
                [username || users[0].username, email || users[0].email, userId]
            );
            
            if (conflicts.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Username atau email sudah digunakan'
                });
            }
        }
        
        // Build update query
        const updates = [];
        const params = [];
        
        if (username) { updates.push('username = ?'); params.push(username); }
        if (email) { updates.push('email = ?'); params.push(email); }
        if (fullName) { updates.push('full_name = ?'); params.push(fullName); }
        if (role) { updates.push('role = ?'); params.push(role); }
        if (phone !== undefined) { updates.push('phone = ?'); params.push(phone || null); }
        if (address !== undefined) { updates.push('address = ?'); params.push(address || null); }
        if (dateOfBirth !== undefined) { updates.push('date_of_birth = ?'); params.push(dateOfBirth || null); }
        
        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada data yang diupdate'
            });
        }
        
        // Add updated_at
        updates.push('updated_at = NOW()');
        
        params.push(userId);
        await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
        
        // Log activity
        await db.query(
            'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
            [req.user.id, 'UPDATE_USER', `Admin mengupdate user: ${users[0].username}`, req.ip]
        );
        
        res.json({
            success: true,
            message: 'User berhasil diupdate'
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengupdate user'
        });
    }
};

// Delete user
const deleteUser = async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        const { id } = req.params;
        const userId = parseInt(id);
        
        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: 'ID user tidak valid'
            });
        }
        
        // Check if user exists
        const [users] = await connection.query('SELECT * FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }
        
        // Don't allow deleting self
        if (userId === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Tidak bisa menghapus akun sendiri'
            });
        }
        
        // Start transaction
        await connection.beginTransaction();
        
        try {
            // Delete in correct order to avoid foreign key constraints
            console.log('Deleting related data for user:', userId);
            
            // Delete medicine logs first (references medicines)
            await connection.query(
                'DELETE ml FROM medicine_logs ml INNER JOIN medicines m ON ml.medicine_id = m.id WHERE m.elderly_id = ?',
                [userId]
            );
            
            // Delete vital signs
            await connection.query('DELETE FROM vital_signs WHERE elderly_id = ?', [userId]);
            
            // Delete activities
            await connection.query('DELETE FROM activities WHERE elderly_id = ?', [userId]);
            
            // Delete from all related tables
            await connection.query('DELETE FROM emergency_contacts WHERE user_id = ?', [userId]);
            await connection.query('DELETE FROM family_elderly_relations WHERE family_user_id = ? OR elderly_user_id = ?', [userId, userId]);
            await connection.query('DELETE FROM medical_assignments WHERE medical_id = ? OR elderly_id = ?', [userId, userId]);
            await connection.query('DELETE FROM medicines WHERE elderly_id = ?', [userId]);
            await connection.query('DELETE FROM appointments WHERE elderly_id = ?', [userId]);
            await connection.query('DELETE FROM chats WHERE sender_id = ? OR receiver_id = ?', [userId, userId]);
            await connection.query('DELETE FROM forum_comments WHERE user_id = ?', [userId]);
            await connection.query('DELETE FROM forum_posts WHERE user_id = ?', [userId]);
            await connection.query('DELETE FROM notifications WHERE user_id = ?', [userId]);
            await connection.query('DELETE FROM monitoring_alerts WHERE elderly_id = ?', [userId]);
            await connection.query('DELETE FROM health_reports WHERE elderly_id = ?', [userId]);
            await connection.query('DELETE FROM user_settings WHERE user_id = ?', [userId]);
            await connection.query('DELETE FROM activity_logs WHERE user_id = ?', [userId]);
            
            // Finally delete the user
            await connection.query('DELETE FROM users WHERE id = ?', [userId]);
            
            // Log activity (after user is deleted)
            await connection.query(
                'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
                [req.user.id, 'DELETE_USER', `Admin menghapus user: ${users[0].username} (ID: ${userId})`, req.ip]
            );
            
            // Commit transaction
            await connection.commit();
            console.log('User deleted successfully:', userId);
            
            res.json({
                success: true,
                message: 'User berhasil dihapus'
            });
        } catch (error) {
            // Rollback on error
            await connection.rollback();
            console.error('Transaction error during delete:', error);
            
            // Check for specific errors
            if (error.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.status(400).json({
                    success: false,
                    message: 'User tidak bisa dihapus karena masih memiliki data terkait'
                });
            }
            
            throw error;
        }
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menghapus user'
        });
    } finally {
        connection.release();
    }
};

// Reset user password
const resetPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        
        const userId = parseInt(id);
        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: 'ID user tidak valid'
            });
        }
        
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password minimal 6 karakter'
            });
        }
        
        // Check if user exists
        const [users] = await db.query('SELECT username FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }
        
        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        // Update password
        await db.query('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', [hashedPassword, userId]);
        
        // Log activity
        await db.query(
            'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
            [req.user.id, 'RESET_PASSWORD', `Admin reset password untuk: ${users[0].username}`, req.ip]
        );
        
        res.json({
            success: true,
            message: 'Password berhasil direset'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal reset password'
        });
    }
};

// Link family to elderly
const linkFamilyElderly = async (req, res) => {
    try {
        const { familyUserId, elderlyUserId, relationship } = req.body;
        
        // Validate users exist and have correct roles
        const [familyUser] = await db.query('SELECT role FROM users WHERE id = ?', [familyUserId]);
        const [elderlyUser] = await db.query('SELECT role FROM users WHERE id = ?', [elderlyUserId]);
        
        if (familyUser.length === 0 || elderlyUser.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }
        
        if (familyUser[0].role !== 'family') {
            return res.status(400).json({
                success: false,
                message: 'User pertama harus memiliki role family'
            });
        }
        
        if (elderlyUser[0].role !== 'elderly') {
            return res.status(400).json({
                success: false,
                message: 'User kedua harus memiliki role elderly'
            });
        }
        
        // Check if relation already exists
        const [existing] = await db.query(
            'SELECT id FROM family_elderly_relations WHERE family_user_id = ? AND elderly_user_id = ?',
            [familyUserId, elderlyUserId]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Relasi sudah ada'
            });
        }
        
        // Create relation
        await db.query(
            'INSERT INTO family_elderly_relations (family_user_id, elderly_user_id, relationship) VALUES (?, ?, ?)',
            [familyUserId, elderlyUserId, relationship || 'Keluarga']
        );
        
        res.json({
            success: true,
            message: 'Relasi berhasil dibuat'
        });
    } catch (error) {
        console.error('Link family elderly error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal membuat relasi'
        });
    }
};

// Get user statistics
const getUserStatistics = async (req, res) => {
    try {
        // Total users by role
        const [roleStats] = await db.query(
            'SELECT role, COUNT(*) as count FROM users GROUP BY role'
        );
        
        // Total users
        const [totalUsers] = await db.query('SELECT COUNT(*) as total FROM users');
        
        // Active users today
        const [activeToday] = await db.query(
            'SELECT COUNT(DISTINCT user_id) as count FROM activity_logs WHERE DATE(created_at) = CURDATE()'
        );
        
        // New users this week
        const [newUsersWeek] = await db.query(
            'SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
        );
        
        res.json({
            success: true,
            data: {
                totalUsers: totalUsers[0].total,
                activeToday: activeToday[0].count,
                newUsersWeek: newUsersWeek[0].count,
                roleDistribution: roleStats
            }
        });
    } catch (error) {
        console.error('Get user statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil statistik'
        });
    }
};

// Get emergency contacts for a user
const getEmergencyContacts = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const [contacts] = await db.query(
            'SELECT * FROM emergency_contacts WHERE user_id = ? ORDER BY priority',
            [userId]
        );
        
        res.json({
            success: true,
            data: contacts
        });
    } catch (error) {
        console.error('Get emergency contacts error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil kontak darurat'
        });
    }
};

// Get current user profile
const getMyProfile = async (req, res) => {
    try {
        // Use the existing getUserById method with the current user's ID
        req.params.id = req.user.id;
        return getUserById(req, res);
    } catch (error) {
        console.error('Get my profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data profil'
        });
    }
};

// Update current user profile
const updateMyProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { email, fullName, phone, address, dateOfBirth, bloodType, medicalConditions, allergies } = req.body;
        
        // Check if email is already taken by another user
        if (email) {
            const [conflicts] = await db.query(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [email, userId]
            );
            
            if (conflicts.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Email sudah digunakan'
                });
            }
        }
        
        // Build update query
        const updates = [];
        const params = [];
        
        if (email) { updates.push('email = ?'); params.push(email); }
        if (fullName !== undefined) { updates.push('full_name = ?'); params.push(fullName); }
        if (phone !== undefined) { updates.push('phone = ?'); params.push(phone || null); }
        if (address !== undefined) { updates.push('address = ?'); params.push(address || null); }
        if (dateOfBirth !== undefined) { updates.push('date_of_birth = ?'); params.push(dateOfBirth || null); }
        if (bloodType !== undefined) { updates.push('blood_type = ?'); params.push(bloodType || null); }
        
        // Add medical fields for elderly users
        if (req.user.role === 'elderly') {
            if (medicalConditions !== undefined) { 
                updates.push('medical_conditions = ?'); 
                params.push(medicalConditions || null); 
            }
            if (allergies !== undefined) { 
                updates.push('allergies = ?'); 
                params.push(allergies || null); 
            }
        }
        
        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada data yang diupdate'
            });
        }
        
        // Add updated_at
        updates.push('updated_at = NOW()');
        
        params.push(userId);
        await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
        
        // Log activity
        await db.query(
            'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
            [userId, 'UPDATE_PROFILE', 'User mengupdate profil', req.ip]
        );
        
        res.json({
            success: true,
            message: 'Profil berhasil diupdate'
        });
    } catch (error) {
        console.error('Update my profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengupdate profil'
        });
    }
};

// Upload avatar
const uploadAvatar = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        // Check if user can update this profile
        if (req.user.id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses untuk mengupdate avatar ini'
            });
        }
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'File tidak ditemukan'
            });
        }
        
        // Get old avatar to delete
        const [users] = await db.query('SELECT profile_image FROM users WHERE id = ?', [userId]);
        const oldImage = users[0]?.profile_image;
        
        // Update database
        await db.query(
            'UPDATE users SET profile_image = ?, updated_at = NOW() WHERE id = ?',
            [req.file.filename, userId]
        );
        
        // Delete old image if exists
        if (oldImage) {
            const oldPath = path.join(__dirname, '..', 'uploads', 'avatars', oldImage);
            fs.unlink(oldPath, (err) => {
                if (err) console.error('Error deleting old avatar:', err);
            });
        }
        
        // Log activity
        await db.query(
            'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
            [req.user.id, 'UPDATE_AVATAR', 'Avatar diupdate', req.ip]
        );
        
        res.json({
            success: true,
            message: 'Avatar berhasil diupdate',
            data: {
                filename: req.file.filename,
                url: `/uploads/avatars/${req.file.filename}`
            }
        });
    } catch (error) {
        console.error('Upload avatar error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengupload avatar'
        });
    }
};

// Get detailed user statistics
const getUserStatisticsDetailed = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        // Check access
        if (req.user.id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses ke statistik ini'
            });
        }
        
        // Get user data
        const [users] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }
        
        const user = users[0];
        
        // Get login count - Fixed to use proper column name
        const [loginStats] = await db.query(
            'SELECT COUNT(*) as loginCount FROM activity_logs WHERE user_id = ? AND action = "LOGIN"',
            [userId]
        );
        
        // Get active days
        const [activeDays] = await db.query(
            'SELECT COUNT(DISTINCT DATE(created_at)) as days FROM activity_logs WHERE user_id = ?',
            [userId]
        );
        
        // Get last activity
        const [lastActivity] = await db.query(
            'SELECT created_at FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
            [userId]
        );
        
        // Role-specific stats
        let additionalStats = {};
        
        if (user.role === 'elderly') {
            // Get vital signs count
            const [vitalCount] = await db.query(
                'SELECT COUNT(*) as count FROM vital_signs WHERE elderly_id = ?',
                [userId]
            );
            additionalStats.vitalSignsCount = vitalCount[0]?.count || 0;
            
            // Get medicine count
            const [medicineCount] = await db.query(
                'SELECT COUNT(*) as count FROM medicines WHERE elderly_id = ? AND is_active = 1',
                [userId]
            );
            additionalStats.activeMedicines = medicineCount[0]?.count || 0;
        }
        
        if (user.role === 'family') {
            // Get connected elderly count
            const [elderlyCount] = await db.query(
                'SELECT COUNT(*) as count FROM family_elderly_relations WHERE family_user_id = ?',
                [userId]
            );
            additionalStats.connectedElderly = elderlyCount[0]?.count || 0;
        }
        
        res.json({
            success: true,
            data: {
                loginCount: loginStats[0]?.loginCount || 0,
                lastLogin: user.last_login,
                activeDays: activeDays[0]?.days || 0,
                lastActivity: lastActivity[0]?.created_at,
                memberSince: user.created_at,
                ...additionalStats
            }
        });
    } catch (error) {
        console.error('Get user statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil statistik'
        });
    }
};

// Get user activities
const getUserActivities = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        // Check access
        if (req.user.id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses ke aktivitas ini'
            });
        }
        
        // Get activities with pagination - Fixed column reference
        const [activities] = await db.query(
            `SELECT 
                al.*,
                u.username as performed_by_username
             FROM activity_logs al
             LEFT JOIN users u ON al.user_id = u.id
             WHERE al.user_id = ?
             ORDER BY al.created_at DESC
             LIMIT ? OFFSET ?`,
            [userId, parseInt(limit), parseInt(offset)]
        );
        
        // Get total count
        const [countResult] = await db.query(
            'SELECT COUNT(*) as total FROM activity_logs WHERE user_id = ?',
            [userId]
        );
        
        res.json({
            success: true,
            data: {
                activities,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: countResult[0]?.total || 0,
                    totalPages: Math.ceil((countResult[0]?.total || 0) / parseInt(limit))
                }
            }
        });
    } catch (error) {
        console.error('Get user activities error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil aktivitas'
        });
    }
};

// Add emergency contact
const addEmergencyContact = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const { contactName, contactPhone, relationship, priority = 1 } = req.body;
        
        // Check access (user can add their own, admin can add for anyone)
        if (req.user.id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses untuk menambah kontak darurat'
            });
        }
        
        // Insert emergency contact
        const [result] = await db.query(
            `INSERT INTO emergency_contacts (user_id, contact_name, contact_phone, relationship, priority) 
             VALUES (?, ?, ?, ?, ?)`,
            [userId, contactName, contactPhone, relationship || null, priority]
        );
        
        // Log activity - Fixed to check for entity_type column
        await db.query(
            'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
            [req.user.id, 'ADD_EMERGENCY_CONTACT', `Menambah kontak darurat: ${contactName}`, req.ip]
        );
        
        res.status(201).json({
            success: true,
            message: 'Kontak darurat berhasil ditambahkan',
            data: {
                id: result.insertId
            }
        });
    } catch (error) {
        console.error('Add emergency contact error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menambahkan kontak darurat'
        });
    }
};

// Update emergency contact
const updateEmergencyContact = async (req, res) => {
    try {
        const contactId = parseInt(req.params.id);
        const { contactName, contactPhone, relationship, priority } = req.body;
        
        // Get contact to check ownership
        const [contacts] = await db.query(
            'SELECT user_id FROM emergency_contacts WHERE id = ?',
            [contactId]
        );
        
        if (contacts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kontak darurat tidak ditemukan'
            });
        }
        
        // Check access
        if (req.user.id !== contacts[0].user_id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses untuk mengupdate kontak ini'
            });
        }
        
        // Build update query
        const updates = [];
        const params = [];
        
        if (contactName) { updates.push('contact_name = ?'); params.push(contactName); }
        if (contactPhone) { updates.push('contact_phone = ?'); params.push(contactPhone); }
        if (relationship !== undefined) { updates.push('relationship = ?'); params.push(relationship || null); }
        if (priority !== undefined) { updates.push('priority = ?'); params.push(priority); }
        
        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada data yang diupdate'
            });
        }
        
        params.push(contactId);
        await db.query(
            `UPDATE emergency_contacts SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
            params
        );
        
        res.json({
            success: true,
            message: 'Kontak darurat berhasil diupdate'
        });
    } catch (error) {
        console.error('Update emergency contact error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengupdate kontak darurat'
        });
    }
};

// Delete emergency contact
const deleteEmergencyContact = async (req, res) => {
    try {
        const contactId = parseInt(req.params.id);
        
        // Get contact to check ownership
        const [contacts] = await db.query(
            'SELECT user_id, contact_name FROM emergency_contacts WHERE id = ?',
            [contactId]
        );
        
        if (contacts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kontak darurat tidak ditemukan'
            });
        }
        
        // Check access
        if (req.user.id !== contacts[0].user_id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak memiliki akses untuk menghapus kontak ini'
            });
        }
        
        // Delete contact
        await db.query('DELETE FROM emergency_contacts WHERE id = ?', [contactId]);
        
        // Log activity
        await db.query(
            'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
            [req.user.id, 'DELETE_EMERGENCY_CONTACT', `Menghapus kontak darurat: ${contacts[0].contact_name}`, req.ip]
        );
        
        res.json({
            success: true,
            message: 'Kontak darurat berhasil dihapus'
        });
    } catch (error) {
        console.error('Delete emergency contact error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menghapus kontak darurat'
        });
    }
};

// Get user preferences
const getUserPreferences = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get or create preferences
        let [preferences] = await db.query(
            'SELECT * FROM user_settings WHERE user_id = ?',
            [userId]
        );
        
        if (preferences.length === 0) {
            // Create default preferences
            await db.query(
                'INSERT INTO user_settings (user_id) VALUES (?)',
                [userId]
            );
            
            [preferences] = await db.query(
                'SELECT * FROM user_settings WHERE user_id = ?',
                [userId]
            );
        }
        
        res.json({
            success: true,
            data: preferences[0]
        });
    } catch (error) {
        console.error('Get user preferences error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil preferensi'
        });
    }
};

// Update user preferences
const updateUserPreferences = async (req, res) => {
    try {
        const userId = req.user.id;
        const { 
            emailNotifications, 
            smsNotifications, 
            pushNotifications,
            theme,
            language 
        } = req.body;
        
        // Check if user_settings exists
        const [existing] = await db.query(
            'SELECT user_id FROM user_settings WHERE user_id = ?',
            [userId]
        );
        
        if (existing.length === 0) {
            // Create new settings
            await db.query(
                `INSERT INTO user_settings (
                    user_id, 
                    email_notifications, 
                    sms_notifications, 
                    push_notifications,
                    theme,
                    language
                ) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    emailNotifications || true,
                    smsNotifications || false,
                    pushNotifications || false,
                    theme || 'light',
                    language || 'id'
                ]
            );
        } else {
            // Build update query
            const updates = [];
            const params = [];
            
            if (emailNotifications !== undefined) { 
                updates.push('email_notifications = ?'); 
                params.push(emailNotifications); 
            }
            if (smsNotifications !== undefined) { 
                updates.push('sms_notifications = ?'); 
                params.push(smsNotifications); 
            }
            if (pushNotifications !== undefined) { 
                updates.push('push_notifications = ?'); 
                params.push(pushNotifications); 
            }
            if (theme) { 
                updates.push('theme = ?'); 
                params.push(theme); 
            }
            if (language) { 
                updates.push('language = ?'); 
                params.push(language); 
            }
            
            if (updates.length > 0) {
                params.push(userId);
                await db.query(
                    `UPDATE user_settings SET ${updates.join(', ')} WHERE user_id = ?`,
                    params
                );
            }
        }
        
        res.json({
            success: true,
            message: 'Preferensi berhasil disimpan'
        });
    } catch (error) {
        console.error('Update user preferences error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menyimpan preferensi'
        });
    }
};

// Export user data (GDPR compliance)
const exportMyData = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Collect all user data
        const userData = {};
        
        // Basic user info
        const [user] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
        userData.profile = user[0];
        delete userData.profile.password; // Remove sensitive data
        
        // Activity logs
        const [activities] = await db.query(
            'SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        userData.activities = activities;
        
        // Emergency contacts
        const [contacts] = await db.query(
            'SELECT * FROM emergency_contacts WHERE user_id = ?',
            [userId]
        );
        userData.emergencyContacts = contacts;
        
        // Preferences
        const [preferences] = await db.query(
            'SELECT * FROM user_settings WHERE user_id = ?',
            [userId]
        );
        userData.preferences = preferences[0] || {};
        
        // Role-specific data
        if (user[0].role === 'elderly') {
            // Vital signs
            const [vitalSigns] = await db.query(
                'SELECT * FROM vital_signs WHERE elderly_id = ? ORDER BY measurement_date DESC',
                [userId]
            );
            userData.vitalSigns = vitalSigns;
            
            // Medicines
            const [medicines] = await db.query(
                'SELECT * FROM medicines WHERE elderly_id = ?',
                [userId]
            );
            userData.medicines = medicines;
            
            // Activities
            const [elderlyActivities] = await db.query(
                'SELECT * FROM activities WHERE elderly_id = ? ORDER BY activity_date DESC',
                [userId]
            );
            userData.elderlyActivities = elderlyActivities;
        }
        
        // Generate JSON file
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=user-data-${userId}-${Date.now()}.json`);
        res.json(userData);
        
    } catch (error) {
        console.error('Export user data error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengekspor data'
        });
    }
};

// Export all functions
module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    resetPassword,
    linkFamilyElderly,
    getUserStatistics,
    getEmergencyContacts,
    getMyProfile,
    updateMyProfile,
    uploadAvatar,
    getUserStatisticsDetailed,
    getUserActivities,
    addEmergencyContact,
    updateEmergencyContact,
    deleteEmergencyContact,
    getUserPreferences,
    updateUserPreferences,
    exportMyData
};