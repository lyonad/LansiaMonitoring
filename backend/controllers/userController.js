// controllers/userController.js
const bcrypt = require('bcryptjs');
const db = require('../config/database');

// Get all users with pagination and filters
const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', role = '' } = req.query;
        const offset = (page - 1) * limit;
        
        let query = 'SELECT id, username, email, full_name, role, phone, created_at FROM users WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
        const params = [];
        const countParams = [];
        
        // Add search filter
        if (search) {
            query += ' AND (username LIKE ? OR email LIKE ? OR full_name LIKE ?)';
            countQuery += ' AND (username LIKE ? OR email LIKE ? OR full_name LIKE ?)';
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam);
            countParams.push(searchParam, searchParam, searchParam);
        }
        
        // Add role filter
        if (role) {
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
        
        const [users] = await db.query(
            'SELECT id, username, email, full_name, role, phone, address, date_of_birth, created_at FROM users WHERE id = ?',
            [id]
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
                [id]
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
                [id]
            );
            familyRelations = relations;
        } else if (users[0].role === 'elderly') {
            const [relations] = await db.query(
                `SELECT u.id, u.username, u.full_name, u.email, fer.relationship 
                 FROM family_elderly_relations fer
                 JOIN users u ON fer.family_user_id = u.id
                 WHERE fer.elderly_user_id = ?`,
                [id]
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
    try {
        const { username, password, email, fullName, role, phone, address, dateOfBirth } = req.body;
        
        // Validate required fields
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
            [req.user.id, 'CREATE_USER', `Admin membuat user baru: ${username}`, req.ip]
        );
        
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
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal membuat user baru'
        });
    }
};

// Update user
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, fullName, role, phone, address, dateOfBirth } = req.body;
        
        // Check if user exists
        const [users] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
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
                [username || users[0].username, email || users[0].email, id]
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
        
        params.push(id);
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
    try {
        const { id } = req.params;
        
        console.log('Attempting to delete user ID:', id);
        
        // Check if user exists
        const [users] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }
        
        // Don't allow deleting self
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Tidak bisa menghapus akun sendiri'
            });
        }
        
        // Start transaction
        const connection = await db.getConnection();
        await connection.beginTransaction();
        
        try {
            // Delete in correct order to avoid foreign key constraints
            console.log('Deleting related data for user:', id);
            
            // Delete medicine logs first (references medicines)
            await connection.query(
                'DELETE ml FROM medicine_logs ml INNER JOIN medicines m ON ml.medicine_id = m.id WHERE m.user_id = ?',
                [id]
            );
            
            // Delete from all related tables
            await connection.query('DELETE FROM emergency_contacts WHERE user_id = ?', [id]);
            await connection.query('DELETE FROM family_elderly_relations WHERE family_user_id = ? OR elderly_user_id = ?', [id, id]);
            await connection.query('DELETE FROM medicines WHERE user_id = ?', [id]);
            await connection.query('DELETE FROM health_records WHERE user_id = ?', [id]);
            await connection.query('DELETE FROM appointments WHERE user_id = ?', [id]);
            await connection.query('DELETE FROM chats WHERE sender_id = ? OR receiver_id = ?', [id, id]);
            await connection.query('DELETE FROM forum_comments WHERE user_id = ?', [id]);
            await connection.query('DELETE FROM forum_posts WHERE user_id = ?', [id]);
            await connection.query('DELETE FROM notifications WHERE user_id = ?', [id]);
            await connection.query('DELETE FROM activity_logs WHERE user_id = ?', [id]);
            
            // Finally delete the user
            await connection.query('DELETE FROM users WHERE id = ?', [id]);
            
            // Commit transaction
            await connection.commit();
            console.log('User deleted successfully:', id);
            
            // Log activity (use connection since user is deleted)
            await connection.query(
                'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
                [req.user.id, 'DELETE_USER', `Admin menghapus user: ${users[0].username} (ID: ${id})`, req.ip]
            );
            
            connection.release();
            
            res.json({
                success: true,
                message: 'User berhasil dihapus'
            });
        } catch (error) {
            // Rollback on error
            await connection.rollback();
            connection.release();
            
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
            message: 'Gagal menghapus user: ' + error.message
        });
    }
};

// Reset user password
const resetPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password minimal 6 karakter'
            });
        }
        
        // Check if user exists
        const [users] = await db.query('SELECT username FROM users WHERE id = ?', [id]);
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
        await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
        
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

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    resetPassword,
    linkFamilyElderly,
    getUserStatistics,
    getEmergencyContacts
};