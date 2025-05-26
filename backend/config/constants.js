 // backend/config/constants.js
module.exports = {
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
  JWT_EXPIRES_IN: '7d',
  
  // Server Configuration
  PORT: process.env.PORT || 4000,
  
  // User Roles
  USER_ROLES: {
    LANSIA: 'lansia',
    KELUARGA: 'keluarga',
    TENAGA_MEDIS: 'tenaga_medis',
    ADMIN: 'admin'
  },
  
  // Status Constants
  MEDICATION_STATUS: {
    AKTIF: 'aktif',
    SELESAI: 'selesai',
    DIBATALKAN: 'dibatalkan'
  },
  
  REMINDER_STATUS: {
    PENDING: 'pending',
    SELESAI: 'selesai',
    TERLEWAT: 'terlewat'
  },
  
  CONSULTATION_STATUS: {
    DIJADWALKAN: 'dijadwalkan',
    BERLANGSUNG: 'berlangsung',
    SELESAI: 'selesai',
    DIBATALKAN: 'dibatalkan'
  },
  
  FORUM_STATUS: {
    AKTIF: 'aktif',
    TERTUTUP: 'tertutup'
  },
  
  // Validation Rules
  VALIDATION: {
    MIN_PASSWORD_LENGTH: 6,
    MAX_NAME_LENGTH: 100,
    MAX_EMAIL_LENGTH: 100,
    MAX_PHONE_LENGTH: 20,
    MIN_AGE: 0,
    MAX_AGE: 150
  },
  
  // Pagination
  PAGINATION: {
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100
  }
};
