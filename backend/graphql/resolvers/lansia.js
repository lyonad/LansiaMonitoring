// backend/graphql/resolvers/lansia.js
const { v4: uuidv4 } = require('uuid');
const { 
  isAuthenticated, 
  canAccessLansia, 
  getAccessibleLansiaIds,
  isKeluarga,
  isAdmin 
} = require('../../utils/auth');

const lansiaResolvers = {
  Query: {
    // Get lansia by ID
    lansia: async (_, { id }, context) => {
      isAuthenticated(context);
      
      // Check if user can access this lansia
      const hasAccess = await canAccessLansia(context, id);
      if (!hasAccess) {
        throw new Error('Anda tidak memiliki akses ke data lansia ini');
      }
      
      try {
        const [rows] = await context.db.execute(
          'SELECT * FROM lansia WHERE id_lansia = ?',
          [id]
        );
        
        if (rows.length === 0) {
          throw new Error('Lansia tidak ditemukan');
        }
        
        return rows[0];
      } catch (error) {
        throw new Error('Error mengambil data lansia: ' + error.message);
      }
    },
    
    // Get all lansia dengan filter
    allLansia: async (_, { filter = {}, limit = 10, offset = 0 }, context) => {
      const user = isAuthenticated(context);
      
      try {
        // Get accessible lansia IDs
        const accessibleIds = await getAccessibleLansiaIds(context);
        
        if (accessibleIds.length === 0) {
          return [];
        }
        
        // Build query
        let query = 'SELECT * FROM lansia WHERE id_lansia IN (?)';
        const params = [accessibleIds];
        
        // Apply filters
        if (filter.nama) {
          query += ' AND nama LIKE ?';
          params.push(`%${filter.nama}%`);
        }
        
        if (filter.usiaMin) {
          query += ' AND usia >= ?';
          params.push(filter.usiaMin);
        }
        
        if (filter.usiaMax) {
          query += ' AND usia <= ?';
          params.push(filter.usiaMax);
        }
        
        if (filter.kondisi) {
          query += ' AND kondisi LIKE ?';
          params.push(`%${filter.kondisi}%`);
        }
        
        if (filter.golongan_darah) {
          query += ' AND golongan_darah = ?';
          params.push(filter.golongan_darah);
        }
        
        query += ' ORDER BY nama ASC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        const [rows] = await context.db.execute(query, params);
        return rows;
      } catch (error) {
        throw new Error('Error mengambil data lansia: ' + error.message);
      }
    },
    
    // Get lansia untuk keluarga tertentu
    lansiaByKeluarga: async (_, { idKeluarga }, context) => {
      isAuthenticated(context);
      
      try {
        const [rows] = await context.db.execute(
          `SELECT l.* FROM lansia l 
           JOIN keluarga k ON l.id_lansia = k.id_lansia 
           WHERE k.id_keluarga = ?`,
          [idKeluarga]
        );
        
        return rows;
      } catch (error) {
        throw new Error('Error mengambil data lansia: ' + error.message);
      }
    },
    
    // Search lansia
    searchLansia: async (_, { keyword }, context) => {
      isAuthenticated(context);
      
      try {
        const accessibleIds = await getAccessibleLansiaIds(context);
        
        if (accessibleIds.length === 0) {
          return [];
        }
        
        const [rows] = await context.db.execute(
          `SELECT * FROM lansia 
           WHERE id_lansia IN (?) 
           AND (nama LIKE ? OR kondisi LIKE ? OR alamat LIKE ?)`,
          [accessibleIds, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`]
        );
        
        return rows;
      } catch (error) {
        throw new Error('Error mencari lansia: ' + error.message);
      }
    },
    
    // Statistik lansia
    statistikLansia: async (_, __, context) => {
      isAdmin(context);
      
      try {
        // Total lansia
        const [totalRows] = await context.db.execute(
          'SELECT COUNT(*) as total FROM lansia'
        );
        const total = totalRows[0].total;
        
        // Berdasarkan usia
        const [usiaRows] = await context.db.execute(`
          SELECT 
            CASE 
              WHEN usia < 65 THEN '< 65'
              WHEN usia BETWEEN 65 AND 74 THEN '65-74'
              WHEN usia BETWEEN 75 AND 84 THEN '75-84'
              ELSE '85+'
            END as age_range,
            COUNT(*) as jumlah
          FROM lansia
          GROUP BY age_range
          ORDER BY age_range
        `);
        
        // Berdasarkan kondisi (top 5)
        const [kondisiRows] = await context.db.execute(`
          SELECT kondisi, COUNT(*) as jumlah
          FROM lansia
          WHERE kondisi IS NOT NULL AND kondisi != ''
          GROUP BY kondisi
          ORDER BY jumlah DESC
          LIMIT 5
        `);
        
        // Berdasarkan golongan darah
        const [golDarahRows] = await context.db.execute(`
          SELECT golongan_darah as golongan, COUNT(*) as jumlah
          FROM lansia
          WHERE golongan_darah IS NOT NULL
          GROUP BY golongan_darah
          ORDER BY golongan_darah
        `);
        
        return {
          total,
          berdasarkanUsia: usiaRows.map(row => ({
            range: row.age_range,
            jumlah: row.jumlah
          })),
          berdasarkanKondisi: kondisiRows,
          berdasarkanGolDarah: golDarahRows
        };
      } catch (error) {
        throw new Error('Error mengambil statistik: ' + error.message);
      }
    }
  },
  
  Mutation: {
    // Create lansia
    createLansia: async (_, { input }, context) => {
      const user = isAuthenticated(context);
      
      const connection = await context.db.getConnection();
      
      try {
        await connection.beginTransaction();
        
        const lansiaId = 'LNS' + uuidv4().substring(0, 8).toUpperCase();
        
        // Insert lansia
        await connection.execute(
          `INSERT INTO lansia 
           (id_lansia, id_pengguna, nama, usia, kondisi, alamat, tanggal_lahir, golongan_darah) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            lansiaId, 
            user.peran === 'lansia' ? user.id_pengguna : null,
            input.nama, 
            input.usia, 
            input.kondisi, 
            input.alamat, 
            input.tanggal_lahir, 
            input.golongan_darah
          ]
        );
        
        // If created by keluarga, create relation
        if (user.peran === 'keluarga' && input.id_keluarga) {
          await connection.execute(
            'UPDATE keluarga SET id_lansia = ? WHERE id_keluarga = ?',
            [lansiaId, input.id_keluarga]
          );
        }
        
        await connection.commit();
        
        // Get created lansia
        const [newLansia] = await context.db.execute(
          'SELECT * FROM lansia WHERE id_lansia = ?',
          [lansiaId]
        );
        
        return newLansia[0];
      } catch (error) {
        await connection.rollback();
        throw new Error('Error membuat data lansia: ' + error.message);
      } finally {
        connection.release();
      }
    },
    
    // Update lansia
    updateLansia: async (_, { id, input }, context) => {
      isAuthenticated(context);
      
      // Check access
      const hasAccess = await canAccessLansia(context, id);
      if (!hasAccess) {
        throw new Error('Anda tidak memiliki akses untuk mengupdate data lansia ini');
      }
      
      try {
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
          `UPDATE lansia SET ${updates.join(', ')} WHERE id_lansia = ?`,
          params
        );
        
        // Get updated lansia
        const [updatedLansia] = await context.db.execute(
          'SELECT * FROM lansia WHERE id_lansia = ?',
          [id]
        );
        
        return updatedLansia[0];
      } catch (error) {
        throw new Error('Error update data lansia: ' + error.message);
      }
    },
    
    // Delete lansia
    deleteLansia: async (_, { id }, context) => {
      isAdmin(context);
      
      try {
        const [result] = await context.db.execute(
          'DELETE FROM lansia WHERE id_lansia = ?',
          [id]
        );
        
        return result.affectedRows > 0;
      } catch (error) {
        throw new Error('Error hapus data lansia: ' + error.message);
      }
    },
    
    // Assign lansia ke keluarga
    assignLansiaToKeluarga: async (_, { idLansia, idKeluarga }, context) => {
      isAuthenticated(context);
      
      try {
        // Update keluarga
        await context.db.execute(
          'UPDATE keluarga SET id_lansia = ? WHERE id_keluarga = ?',
          [idLansia, idKeluarga]
        );
        
        // Get updated lansia
        const [lansia] = await context.db.execute(
          'SELECT * FROM lansia WHERE id_lansia = ?',
          [idLansia]
        );
        
        return lansia[0];
      } catch (error) {
        throw new Error('Error assign lansia: ' + error.message);
      }
    }
  },
  
  // Field resolvers
  Lansia: {
    // Get related pengguna
    pengguna: async (parent, _, { db }) => {
      if (!parent.id_pengguna) return null;
      
      const [rows] = await db.execute(
        'SELECT * FROM pengguna WHERE id_pengguna = ?',
        [parent.id_pengguna]
      );
      
      return rows[0] || null;
    },
    
    // Get keluarga
    keluarga: async (parent, _, { db }) => {
      const [rows] = await db.execute(
        'SELECT * FROM keluarga WHERE id_lansia = ?',
        [parent.id_lansia]
      );
      
      return rows;
    },
    
    // Get jadwal obat
    jadwalObat: async (parent, _, { db }) => {
      const [rows] = await db.execute(
        'SELECT * FROM jadwal_konsumsi_obat WHERE id_lansia = ? AND status = "aktif" ORDER BY waktu',
        [parent.id_lansia]
      );
      
      return rows;
    },
    
    // Get pemantauan kesehatan
    pemantauanKesehatan: async (parent, _, { db }) => {
      const [rows] = await db.execute(
        'SELECT * FROM pemantauan_kesehatan WHERE id_lansia = ? ORDER BY tanggal_pemeriksaan DESC',
        [parent.id_lansia]
      );
      
      return rows;
    },
    
    // Get pemantauan terakhir
    pemantauanTerakhir: async (parent, _, { db }) => {
      const [rows] = await db.execute(
        'SELECT * FROM pemantauan_kesehatan WHERE id_lansia = ? ORDER BY tanggal_pemeriksaan DESC LIMIT 1',
        [parent.id_lansia]
      );
      
      return rows[0] || null;
    },
    
    // Get jadwal obat hari ini
    jadwalObatHariIni: async (parent, _, { db }) => {
      const today = new Date().toISOString().split('T')[0];
      
      const [rows] = await db.execute(
        `SELECT * FROM jadwal_konsumsi_obat 
         WHERE id_lansia = ? 
         AND status = "aktif"
         AND (tanggal_mulai <= ? AND (tanggal_selesai >= ? OR tanggal_selesai IS NULL))
         ORDER BY waktu`,
        [parent.id_lansia, today, today]
      );
      
      return rows;
    },
    
    // Get konsultasi mendatang
    konsultasiMendatang: async (parent, _, { db }) => {
      const now = new Date().toISOString();
      
      const [rows] = await db.execute(
        `SELECT * FROM konsultasi 
         WHERE id_lansia = ? 
         AND waktu >= ?
         AND status IN ("dijadwalkan", "berlangsung")
         ORDER BY waktu
         LIMIT 5`,
        [parent.id_lansia, now]
      );
      
      return rows;
    }
  }
};

module.exports = lansiaResolvers;
