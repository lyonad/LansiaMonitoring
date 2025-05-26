 // backend/utils/auth.js
const jwt = require('jsonwebtoken');
const { JWT_SECRET, USER_ROLES } = require('../config/constants');

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Token tidak valid');
  }
};

// Check if user is authenticated
const isAuthenticated = (context) => {
  if (!context.user) {
    throw new Error('Anda harus login untuk mengakses fitur ini');
  }
  return context.user;
};

// Check if user has specific role
const hasRole = (context, role) => {
  const user = isAuthenticated(context);
  if (user.peran !== role) {
    throw new Error(`Hanya ${role} yang dapat mengakses fitur ini`);
  }
  return user;
};

// Check if user is admin
const isAdmin = (context) => {
  return hasRole(context, USER_ROLES.ADMIN);
};

// Check if user is lansia
const isLansia = (context) => {
  return hasRole(context, USER_ROLES.LANSIA);
};

// Check if user is keluarga
const isKeluarga = (context) => {
  return hasRole(context, USER_ROLES.KELUARGA);
};

// Check if user is tenaga medis
const isTenagaMedis = (context) => {
  return hasRole(context, USER_ROLES.TENAGA_MEDIS);
};

// Check if user can access lansia data
const canAccessLansia = async (context, idLansia) => {
  const user = isAuthenticated(context);
  
  // Admin can access all
  if (user.peran === USER_ROLES.ADMIN) {
    return true;
  }
  
  // Check based on role
  switch (user.peran) {
    case USER_ROLES.LANSIA:
      // Lansia can only access their own data
      const [lansiaRows] = await context.db.execute(
        'SELECT id_lansia FROM lansia WHERE id_pengguna = ? AND id_lansia = ?',
        [user.id_pengguna, idLansia]
      );
      return lansiaRows.length > 0;
      
    case USER_ROLES.KELUARGA:
      // Keluarga can access their assigned lansia
      const [keluargaRows] = await context.db.execute(
        'SELECT k.id_keluarga FROM keluarga k WHERE k.id_pengguna = ? AND k.id_lansia = ?',
        [user.id_pengguna, idLansia]
      );
      return keluargaRows.length > 0;
      
    case USER_ROLES.TENAGA_MEDIS:
      // Tenaga medis can access lansia they have consultations with
      const [medisRows] = await context.db.execute(
        `SELECT DISTINCT k.id_konsultasi 
         FROM konsultasi k 
         JOIN tenaga_medis tm ON k.id_tenaga_medis = tm.id_tenaga_medis 
         WHERE tm.id_pengguna = ? AND k.id_lansia = ?`,
        [user.id_pengguna, idLansia]
      );
      return medisRows.length > 0;
      
    default:
      return false;
  }
};

// Get accessible lansia IDs for current user
const getAccessibleLansiaIds = async (context) => {
  const user = isAuthenticated(context);
  
  // Admin can access all
  if (user.peran === USER_ROLES.ADMIN) {
    const [rows] = await context.db.execute('SELECT id_lansia FROM lansia');
    return rows.map(row => row.id_lansia);
  }
  
  let query;
  switch (user.peran) {
    case USER_ROLES.LANSIA:
      query = 'SELECT id_lansia FROM lansia WHERE id_pengguna = ?';
      break;
      
    case USER_ROLES.KELUARGA:
      query = 'SELECT id_lansia FROM keluarga WHERE id_pengguna = ?';
      break;
      
    case USER_ROLES.TENAGA_MEDIS:
      query = `
        SELECT DISTINCT k.id_lansia 
        FROM konsultasi k 
        JOIN tenaga_medis tm ON k.id_tenaga_medis = tm.id_tenaga_medis 
        WHERE tm.id_pengguna = ?
      `;
      break;
      
    default:
      return [];
  }
  
  const [rows] = await context.db.execute(query, [user.id_pengguna]);
  return rows.map(row => row.id_lansia);
};

module.exports = {
  verifyToken,
  isAuthenticated,
  hasRole,
  isAdmin,
  isLansia,
  isKeluarga,
  isTenagaMedis,
  canAccessLansia,
  getAccessibleLansiaIds
};
