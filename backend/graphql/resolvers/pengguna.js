// backend/graphql/resolvers/pengguna.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { JWT_SECRET, JWT_EXPIRES_IN, USER_ROLES } = require('../../config/constants');

// Helper function untuk generate JWT token
const generateToken = (userId, email, peran) => {
  return jwt.sign(
    { userId, email, peran },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Helper untuk check authorization
const checkAuth = (context) => {
  if (!context.user) {
    throw new Error('Anda harus login untuk mengakses fitur ini');
  }
  return context.user;
};

// Helper untuk check admin role
const checkAdmin = (context) => {
  const user = checkAuth(context);
  if (user.peran !== USER_ROLES.ADMIN) {
    throw new Error('Hanya admin yang dapat mengakses fitur ini');
  }
  return user;
};

const penggunaResolvers = {
  Query: {
    // Get current user dari token
    me: async (_, __, { user, db }) => {
      if (!user) return null;
      
      try {
        const [rows] = await db.execute(
          'SELECT * FROM pengguna WHERE id_pengguna = ?',
          [user.id_pengguna]
        );
        
        return rows[0];
      } catch (error) {
        throw new Error('Error mengambil data user: ' + error.message);
      }
    },
    
    // Get user by ID (admin only)
    pengguna: async (_, { id }, context) => {
      checkAdmin(context);
      
      try {
        const [rows] = await context.db.execute(
          'SELECT * FROM pengguna WHERE id_pengguna = ?',
          [id]
        );
        
        if (rows.length === 0) {
          throw new Error('User tidak ditemukan');
        }
        
        return rows[0];
      } catch (error) {
        throw new Error('Error mengambil data user: ' + error.message);
      }
    },
    
    // Get all users dengan filter
    allPengguna: async (_, { peran, limit = 10, offset = 0 }, context) => {
      checkAdmin(context);
      
      try {
        let query = 'SELECT * FROM pengguna';
        const params = [];
        
        if (peran) {
          query += ' WHERE peran = ?';
          params.push(peran);
        }
        
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        const [rows] = await context.db.execute(query, params);
        return rows;
      } catch (error) {
        throw new Error('Error mengambil data users: ' + error.message);
      }
    },
    
    // Count users
    countPengguna: async (_, { peran }, context) => {
      checkAdmin(context);
      
      try {
        let query = 'SELECT COUNT(*) as total FROM pengguna';
        const params = [];
        
        if (peran) {
          query += ' WHERE peran = ?';
          params.push(peran);
        }
        
        const [rows] = await context.db.execute(query, params);
        return rows[0].total;
      } catch (error) {
        throw new Error('Error menghitung users: ' + error.message);
      }
    }
  },
  
  Mutation: {
    // Register user baru
    register: async (_, { input }, { db }) => {
      const { nama, email, password, peran, dataLansia, dataKeluarga, dataTenagaMedis } = input;
      
      const connection = await db.getConnection();
      
      try {
        await connection.beginTransaction();
        
        // Check if email already exists
        const [existing] = await connection.execute(
          'SELECT id_pengguna FROM pengguna WHERE email = ?',
          [email]
        );
        
        if (existing.length > 0) {
          throw new Error('Email sudah terdaftar');
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user ID
        const userId = 'USR' + uuidv4().substring(0, 8).toUpperCase();
        
        // Insert user
        await connection.execute(
          'INSERT INTO pengguna (id_pengguna, nama, email, password, peran) VALUES (?, ?, ?, ?, ?)',
          [userId, nama, email, hashedPassword, peran]
        );
        
        // Insert role-specific data
        if (peran === USER_ROLES.LANSIA && dataLansia) {
          const lansiaId = 'LNS' + uuidv4().substring(0, 8).toUpperCase();
          await connection.execute(
            'INSERT INTO lansia (id_lansia, id_pengguna, nama, usia, kondisi, alamat, tanggal_lahir, golongan_darah) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [lansiaId, userId, dataLansia.nama, dataLansia.usia, dataLansia.kondisi, dataLansia.alamat, dataLansia.tanggal_lahir, dataLansia.golongan_darah]
          );
        } else if (peran === USER_ROLES.KELUARGA && dataKeluarga) {
          const keluargaId = 'KEL' + uuidv4().substring(0, 8).toUpperCase();
          await connection.execute(
            'INSERT INTO keluarga (id_keluarga, id_pengguna, id_lansia, nama, hubungan_dengan_lansia, nomor_telepon) VALUES (?, ?, ?, ?, ?, ?)',
            [keluargaId, userId, dataKeluarga.id_lansia, dataKeluarga.nama, dataKeluarga.hubungan_dengan_lansia, dataKeluarga.nomor_telepon]
          );
        } else if (peran === USER_ROLES.TENAGA_MEDIS && dataTenagaMedis) {
          const medisId = 'MED' + uuidv4().substring(0, 8).toUpperCase();
          await connection.execute(
            'INSERT INTO tenaga_medis (id_tenaga_medis, id_pengguna, nama, spesialisasi, nomor_str, rumah_sakit, nomor_telepon) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [medisId, userId, dataTenagaMedis.nama, dataTenagaMedis.spesialisasi, dataTenagaMedis.nomor_str, dataTenagaMedis.rumah_sakit, dataTenagaMedis.nomor_telepon]
          );
        }
        
        await connection.commit();
        
        // Generate token
        const token = generateToken(userId, email, peran);
        
        // Get created user
        const [newUser] = await db.execute(
          'SELECT * FROM pengguna WHERE id_pengguna = ?',
          [userId]
        );
        
        return {
          token,
          user: newUser[0]
        };
      } catch (error) {
        await connection.rollback();
        throw new Error('Error registrasi: ' + error.message);
      } finally {
        connection.release();
      }
    },
    
    // Login
    login: async (_, { email, password }, { db }) => {
      try {
        // Get user by email
        const [users] = await db.execute(
          'SELECT * FROM pengguna WHERE email = ?',
          [email]
        );
        
        if (users.length === 0) {
          throw new Error('Email atau password salah');
        }
        
        const user = users[0];
        
        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          throw new Error('Email atau password salah');
        }
        
        // Generate token
        const token = generateToken(user.id_pengguna, user.email, user.peran);
        
        return {
          token,
          user
        };
      } catch (error) {
        throw new Error('Error login: ' + error.message);
      }
    },
    
    // Update profile
    updateProfile: async (_, { input }, context) => {
      const user = checkAuth(context);
      const { nama, email, password } = input;
      
      try {
        const updates = [];
        const params = [];
        
        if (nama) {
          updates.push('nama = ?');
          params.push(nama);
        }
        
        if (email) {
          // Check if email already exists
          const [existing] = await context.db.execute(
            'SELECT id_pengguna FROM pengguna WHERE email = ? AND id_pengguna != ?',
            [email, user.id_pengguna]
          );
          
          if (existing.length > 0) {
            throw new Error('Email sudah digunakan');
          }
          
          updates.push('email = ?');
          params.push(email);
        }
        
        if (password) {
          const hashedPassword = await bcrypt.hash(password, 10);
          updates.push('password = ?');
          params.push(hashedPassword);
        }
        
        if (updates.length === 0) {
          throw new Error('Tidak ada data yang diupdate');
        }
        
        params.push(user.id_pengguna);
        
        await context.db.execute(
          `UPDATE pengguna SET ${updates.join(', ')} WHERE id_pengguna = ?`,
          params
        );
        
        // Get updated user
        const [updatedUser] = await context.db.execute(
          'SELECT * FROM pengguna WHERE id_pengguna = ?',
          [user.id_pengguna]
        );
        
        return updatedUser[0];
      } catch (error) {
        throw new Error('Error update profile: ' + error.message);
      }
    },
    
    // Change password
    changePassword: async (_, { oldPassword, newPassword }, context) => {
      const user = checkAuth(context);
      
      try {
        // Get current user data
        const [users] = await context.db.execute(
          'SELECT password FROM pengguna WHERE id_pengguna = ?',
          [user.id_pengguna]
        );
        
        // Check old password
        const validPassword = await bcrypt.compare(oldPassword, users[0].password);
        if (!validPassword) {
          throw new Error('Password lama salah');
        }
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password
        await context.db.execute(
          'UPDATE pengguna SET password = ? WHERE id_pengguna = ?',
          [hashedPassword, user.id_pengguna]
        );
        
        return true;
      } catch (error) {
        throw new Error('Error ganti password: ' + error.message);
      }
    }
  },
  
  // Field resolvers
  Pengguna: {
    // Get related lansia data
    lansia: async (parent, _, { db }) => {
      if (parent.peran !== USER_ROLES.LANSIA) return null;
      
      const [rows] = await db.execute(
        'SELECT * FROM lansia WHERE id_pengguna = ?',
        [parent.id_pengguna]
      );
      
      return rows[0] || null;
    },
    
    // Get related keluarga data
    keluarga: async (parent, _, { db }) => {
      if (parent.peran !== USER_ROLES.KELUARGA) return null;
      
      const [rows] = await db.execute(
        'SELECT * FROM keluarga WHERE id_pengguna = ?',
        [parent.id_pengguna]
      );
      
      return rows[0] || null;
    },
    
    // Get related tenaga medis data
    tenagaMedis: async (parent, _, { db }) => {
      if (parent.peran !== USER_ROLES.TENAGA_MEDIS) return null;
      
      const [rows] = await db.execute(
        'SELECT * FROM tenaga_medis WHERE id_pengguna = ?',
        [parent.id_pengguna]
      );
      
      return rows[0] || null;
    }
  }
};

module.exports = penggunaResolvers;
