 // backend/graphql/resolvers/jadwalObat.js
const { v4: uuidv4 } = require('uuid');

// Helper untuk check authorization
const checkAuth = (context) => {
  if (!context.user) {
    throw new Error('Anda harus login untuk mengakses fitur ini');
  }
  return context.user;
};

// Helper untuk check akses ke data lansia
const canAccessLansia = async (user, idLansia, db) => {
  // Admin bisa akses semua
  if (user.peran === 'admin') return true;
  
  // Lansia hanya bisa akses data sendiri
  if (user.peran === 'lansia') {
    const [rows] = await db.execute(
      'SELECT id_lansia FROM lansia WHERE id_pengguna = ? AND id_lansia = ?',
      [user.id_pengguna, idLansia]
    );
    return rows.length > 0;
  }
  
  // Keluarga bisa akses lansia yang terhubung
  if (user.peran === 'keluarga') {
    const [rows] = await db.execute(
      'SELECT id_keluarga FROM keluarga WHERE id_pengguna = ? AND id_lansia = ?',
      [user.id_pengguna, idLansia]
    );
    return rows.length > 0;
  }
  
  // Tenaga medis bisa akses lansia yang pernah konsultasi
  if (user.peran === 'tenaga_medis') {
    const [rows] = await db.execute(
      `SELECT DISTINCT k.id_konsultasi 
       FROM konsultasi k 
       JOIN tenaga_medis tm ON k.id_tenaga_medis = tm.id_tenaga_medis 
       WHERE tm.id_pengguna = ? AND k.id_lansia = ?`,
      [user.id_pengguna, idLansia]
    );
    return rows.length > 0;
  }
  
  return false;
};

const jadwalObatResolvers = {
  Query: {
    // Get jadwal obat by ID
    jadwalObat: async (_, { id }, context) => {
      const user = checkAuth(context);
      
      try {
        const [rows] = await context.db.execute(
          'SELECT * FROM jadwal_konsumsi_obat WHERE id_jadwal_konsumsi_obat = ?',
          [id]
        );
        
        if (rows.length === 0) {
          throw new Error('Jadwal obat tidak ditemukan');
        }
        
        const jadwal = rows[0];
        
        // Check access
        const hasAccess = await canAccessLansia(user, jadwal.id_lansia, context.db);
        if (!hasAccess) {
          throw new Error('Anda tidak memiliki akses ke data ini');
        }
        
        return jadwal;
      } catch (error) {
        throw new Error('Error mengambil jadwal obat: ' + error.message);
      }
    },
    
    // Get jadwal obat by lansia
    jadwalObatByLansia: async (_, { idLansia, status }, context) => {
      const user = checkAuth(context);
      
      // Check access
      const hasAccess = await canAccessLansia(user, idLansia, context.db);
      if (!hasAccess) {
        throw new Error('Anda tidak memiliki akses ke data lansia ini');
      }
      
      try {
        let query = 'SELECT * FROM jadwal_konsumsi_obat WHERE id_lansia = ?';
        const params = [idLansia];
        
        if (status) {
          query += ' AND status = ?';
          params.push(status);
        }
        
        query += ' ORDER BY waktu ASC';
        
        const [rows] = await context.db.execute(query, params);
        return rows;
      } catch (error) {
        throw new Error('Error mengambil jadwal obat: ' + error.message);
      }
    },
    
    // Get jadwal obat hari ini
    jadwalObatHariIni: async (_, { idLansia }, context) => {
      const user = checkAuth(context);
      
      try {
        const today = new Date().toISOString().split('T')[0];
        let query = `
          SELECT j.* FROM jadwal_konsumsi_obat j
          WHERE j.status = 'aktif'
          AND (j.tanggal_mulai <= ? AND (j.tanggal_selesai >= ? OR j.tanggal_selesai IS NULL))
        `;
        const params = [today, today];
        
        // Filter by lansia if specified
        if (idLansia) {
          const hasAccess = await canAccessLansia(user, idLansia, context.db);
          if (!hasAccess) {
            throw new Error('Anda tidak memiliki akses ke data lansia ini');
          }
          query += ' AND j.id_lansia = ?';
          params.push(idLansia);
        } else {
          // Get all accessible lansia IDs
          if (user.peran === 'lansia') {
            const [lansiaRows] = await context.db.execute(
              'SELECT id_lansia FROM lansia WHERE id_pengguna = ?',
              [user.id_pengguna]
            );
            if (lansiaRows.length > 0) {
              query += ' AND j.id_lansia = ?';
              params.push(lansiaRows[0].id_lansia);
            }
          } else if (user.peran === 'keluarga') {
            const [keluargaRows] = await context.db.execute(
              'SELECT id_lansia FROM keluarga WHERE id_pengguna = ?',
              [user.id_pengguna]
            );
            if (keluargaRows.length > 0) {
              query += ' AND j.id_lansia IN (?)';
              params.push(keluargaRows.map(k => k.id_lansia));
            }
          }
        }
        
        query += ' ORDER BY j.waktu ASC';
        
        const [rows] = await context.db.execute(query, params);
        return rows;
      } catch (error) {
        throw new Error('Error mengambil jadwal obat hari ini: ' + error.message);
      }
    },
    
    // Get all jadwal obat (admin/dokter only)
    allJadwalObat: async (_, { limit = 10, offset = 0 }, context) => {
      const user = checkAuth(context);
      
      if (user.peran !== 'admin' && user.peran !== 'tenaga_medis') {
        throw new Error('Hanya admin dan tenaga medis yang dapat mengakses fitur ini');
      }
      
      try {
        const [rows] = await context.db.execute(
          'SELECT * FROM jadwal_konsumsi_obat ORDER BY created_at DESC LIMIT ? OFFSET ?',
          [limit, offset]
        );
        return rows;
      } catch (error) {
        throw new Error('Error mengambil semua jadwal obat: ' + error.message);
      }
    }
  },
  
  Mutation: {
    // Create jadwal obat
    createJadwalObat: async (_, { input }, context) => {
      const user = checkAuth(context);
      
      // Check access to lansia
      const hasAccess = await canAccessLansia(user, input.id_lansia, context.db);
      if (!hasAccess) {
        throw new Error('Anda tidak memiliki akses untuk membuat jadwal obat untuk lansia ini');
      }
      
      try {
        const jadwalId = 'JDW' + uuidv4().substring(0, 8).toUpperCase();
        
        await context.db.execute(
          `INSERT INTO jadwal_konsumsi_obat 
           (id_jadwal_konsumsi_obat, id_lansia, obat, dosis, waktu, frekuensi, 
            tanggal_mulai, tanggal_selesai, catatan, status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'aktif')`,
          [
            jadwalId,
            input.id_lansia,
            input.obat,
            input.dosis,
            input.waktu,
            input.frekuensi,
            input.tanggal_mulai,
            input.tanggal_selesai,
            input.catatan
          ]
        );
        
        // Get created jadwal
        const [newJadwal] = await context.db.execute(
          'SELECT * FROM jadwal_konsumsi_obat WHERE id_jadwal_konsumsi_obat = ?',
          [jadwalId]
        );
        
        return newJadwal[0];
      } catch (error) {
        throw new Error('Error membuat jadwal obat: ' + error.message);
      }
    },
    
    // Update jadwal obat
    updateJadwalObat: async (_, { id, input }, context) => {
      const user = checkAuth(context);
      
      try {
        // Get existing jadwal to check access
        const [existing] = await context.db.execute(
          'SELECT id_lansia FROM jadwal_konsumsi_obat WHERE id_jadwal_konsumsi_obat = ?',
          [id]
        );
        
        if (existing.length === 0) {
          throw new Error('Jadwal obat tidak ditemukan');
        }
        
        const hasAccess = await canAccessLansia(user, existing[0].id_lansia, context.db);
        if (!hasAccess) {
          throw new Error('Anda tidak memiliki akses untuk mengupdate jadwal obat ini');
        }
        
        // Build update query
        const updates = [];
        const params = [];
        
        Object.keys(input).forEach(key => {
          if (input[key] !== undefined) {
            updates.push(`${key} = ?`);
            params.push(input[key]);
          }
        });
        
        if (updates.length === 0) {
          throw new Error('Tidak ada data yang diupdate');
        }
        
        params.push(id);
        
        await context.db.execute(
          `UPDATE jadwal_konsumsi_obat SET ${updates.join(', ')} WHERE id_jadwal_konsumsi_obat = ?`,
          params
        );
        
        // Get updated jadwal
        const [updatedJadwal] = await context.db.execute(
          'SELECT * FROM jadwal_konsumsi_obat WHERE id_jadwal_konsumsi_obat = ?',
          [id]
        );
        
        return updatedJadwal[0];
      } catch (error) {
        throw new Error('Error update jadwal obat: ' + error.message);
      }
    },
    
    // Delete jadwal obat
    deleteJadwalObat: async (_, { id }, context) => {
      const user = checkAuth(context);
      
      try {
        // Get existing jadwal to check access
        const [existing] = await context.db.execute(
          'SELECT id_lansia FROM jadwal_konsumsi_obat WHERE id_jadwal_konsumsi_obat = ?',
          [id]
        );
        
        if (existing.length === 0) {
          throw new Error('Jadwal obat tidak ditemukan');
        }
        
        const hasAccess = await canAccessLansia(user, existing[0].id_lansia, context.db);
        if (!hasAccess) {
          throw new Error('Anda tidak memiliki akses untuk menghapus jadwal obat ini');
        }
        
        const [result] = await context.db.execute(
          'DELETE FROM jadwal_konsumsi_obat WHERE id_jadwal_konsumsi_obat = ?',
          [id]
        );
        
        return result.affectedRows > 0;
      } catch (error) {
        throw new Error('Error hapus jadwal obat: ' + error.message);
      }
    },
    
    // Update status jadwal obat
    updateStatusJadwalObat: async (_, { id, status }, context) => {
      const user = checkAuth(context);
      
      try {
        // Get existing jadwal to check access
        const [existing] = await context.db.execute(
          'SELECT id_lansia FROM jadwal_konsumsi_obat WHERE id_jadwal_konsumsi_obat = ?',
          [id]
        );
        
        if (existing.length === 0) {
          throw new Error('Jadwal obat tidak ditemukan');
        }
        
        const hasAccess = await canAccessLansia(user, existing[0].id_lansia, context.db);
        if (!hasAccess) {
          throw new Error('Anda tidak memiliki akses untuk mengupdate status jadwal obat ini');
        }
        
        await context.db.execute(
          'UPDATE jadwal_konsumsi_obat SET status = ? WHERE id_jadwal_konsumsi_obat = ?',
          [status, id]
        );
        
        // Get updated jadwal
        const [updatedJadwal] = await context.db.execute(
          'SELECT * FROM jadwal_konsumsi_obat WHERE id_jadwal_konsumsi_obat = ?',
          [id]
        );
        
        return updatedJadwal[0];
      } catch (error) {
        throw new Error('Error update status jadwal obat: ' + error.message);
      }
    }
  },
  
  // Field resolver
  JadwalKonsumsiObat: {
    // Get related lansia data
    lansia: async (parent, _, { db }) => {
      const [rows] = await db.execute(
        'SELECT * FROM lansia WHERE id_lansia = ?',
        [parent.id_lansia]
      );
      return rows[0];
    }
  }
};

module.exports = jadwalObatResolvers;
