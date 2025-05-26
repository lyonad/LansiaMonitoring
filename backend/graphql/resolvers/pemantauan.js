 // backend/graphql/resolvers/pemantauan.js
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

// Helper untuk evaluasi status kesehatan
const evaluateBloodPressure = (sistolik, diastolik) => {
  if (sistolik < 90 || diastolik < 60) return 'Rendah';
  if (sistolik >= 140 || diastolik >= 90) return 'Tinggi';
  if (sistolik >= 120 || diastolik >= 80) return 'Pre-Hipertensi';
  return 'Normal';
};

const evaluateBloodSugar = (gulaDarah) => {
  if (gulaDarah < 70) return 'Rendah';
  if (gulaDarah > 140) return 'Tinggi';
  return 'Normal';
};

const calculateBMI = (beratBadan, tinggiBadan) => {
  if (!beratBadan || !tinggiBadan) return null;
  const tinggiMeter = tinggiBadan / 100;
  return beratBadan / (tinggiMeter * tinggiMeter);
};

const evaluateBMI = (bmi) => {
  if (!bmi) return null;
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
};

const pemantauanResolvers = {
  Query: {
    // Get pemantauan by ID
    pemantauanKesehatan: async (_, { id }, context) => {
      const user = checkAuth(context);
      
      try {
        const [rows] = await context.db.execute(
          'SELECT * FROM pemantauan_kesehatan WHERE id_pemantauan_kesehatan = ?',
          [id]
        );
        
        if (rows.length === 0) {
          throw new Error('Data pemantauan tidak ditemukan');
        }
        
        const pemantauan = rows[0];
        
        // Check access
        const hasAccess = await canAccessLansia(user, pemantauan.id_lansia, context.db);
        if (!hasAccess) {
          throw new Error('Anda tidak memiliki akses ke data ini');
        }
        
        return pemantauan;
      } catch (error) {
        throw new Error('Error mengambil data pemantauan: ' + error.message);
      }
    },
    
    // Get pemantauan by lansia
    pemantauanByLansia: async (_, { idLansia, limit = 10, offset = 0 }, context) => {
      const user = checkAuth(context);
      
      // Check access
      const hasAccess = await canAccessLansia(user, idLansia, context.db);
      if (!hasAccess) {
        throw new Error('Anda tidak memiliki akses ke data lansia ini');
      }
      
      try {
        const [rows] = await context.db.execute(
          `SELECT * FROM pemantauan_kesehatan 
           WHERE id_lansia = ? 
           ORDER BY tanggal_pemeriksaan DESC 
           LIMIT ? OFFSET ?`,
          [idLansia, limit, offset]
        );
        
        return rows;
      } catch (error) {
        throw new Error('Error mengambil data pemantauan: ' + error.message);
      }
    },
    
    // Get pemantauan terakhir
    pemantauanTerakhir: async (_, { idLansia }, context) => {
      const user = checkAuth(context);
      
      // Check access
      const hasAccess = await canAccessLansia(user, idLansia, context.db);
      if (!hasAccess) {
        throw new Error('Anda tidak memiliki akses ke data lansia ini');
      }
      
      try {
        const [rows] = await context.db.execute(
          `SELECT * FROM pemantauan_kesehatan 
           WHERE id_lansia = ? 
           ORDER BY tanggal_pemeriksaan DESC 
           LIMIT 1`,
          [idLansia]
        );
        
        return rows[0] || null;
      } catch (error) {
        throw new Error('Error mengambil pemantauan terakhir: ' + error.message);
      }
    },
    
    // Get pemantauan by date range
    pemantauanByDateRange: async (_, { idLansia, startDate, endDate }, context) => {
      const user = checkAuth(context);
      
      // Check access
      const hasAccess = await canAccessLansia(user, idLansia, context.db);
      if (!hasAccess) {
        throw new Error('Anda tidak memiliki akses ke data lansia ini');
      }
      
      try {
        const [rows] = await context.db.execute(
          `SELECT * FROM pemantauan_kesehatan 
           WHERE id_lansia = ? 
           AND DATE(tanggal_pemeriksaan) BETWEEN ? AND ?
           ORDER BY tanggal_pemeriksaan DESC`,
          [idLansia, startDate, endDate]
        );
        
        return rows;
      } catch (error) {
        throw new Error('Error mengambil data pemantauan: ' + error.message);
      }
    },
    
    // Get statistik kesehatan
    statistikKesehatan: async (_, { idLansia, periode = 30 }, context) => {
      const user = checkAuth(context);
      
      // Check access
      const hasAccess = await canAccessLansia(user, idLansia, context.db);
      if (!hasAccess) {
        throw new Error('Anda tidak memiliki akses ke data lansia ini');
      }
      
      try {
        const [rows] = await context.db.execute(
          `SELECT 
            AVG(tekanan_darah_sistolik) as rata_sistolik,
            AVG(tekanan_darah_diastolik) as rata_diastolik,
            AVG(gula_darah) as rata_gula,
            AVG(detak_jantung) as rata_detak
           FROM pemantauan_kesehatan 
           WHERE id_lansia = ? 
           AND tanggal_pemeriksaan >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
          [idLansia, periode]
        );
        
        // Get data untuk trend analysis
        const [trendData] = await context.db.execute(
          `SELECT 
            tekanan_darah_sistolik,
            tekanan_darah_diastolik,
            gula_darah,
            tanggal_pemeriksaan
           FROM pemantauan_kesehatan 
           WHERE id_lansia = ? 
           AND tanggal_pemeriksaan >= DATE_SUB(NOW(), INTERVAL ? DAY)
           ORDER BY tanggal_pemeriksaan`,
          [idLansia, periode]
        );
        
        // Calculate trends
        let trenTekananDarah = 'Stabil';
        let trenGulaDarah = 'Stabil';
        
        if (trendData.length >= 2) {
          const firstHalf = trendData.slice(0, Math.floor(trendData.length / 2));
          const secondHalf = trendData.slice(Math.floor(trendData.length / 2));
          
          const avgSistolikFirst = firstHalf.reduce((sum, d) => sum + (d.tekanan_darah_sistolik || 0), 0) / firstHalf.length;
          const avgSistolikSecond = secondHalf.reduce((sum, d) => sum + (d.tekanan_darah_sistolik || 0), 0) / secondHalf.length;
          
          const avgGulaFirst = firstHalf.reduce((sum, d) => sum + (d.gula_darah || 0), 0) / firstHalf.length;
          const avgGulaSecond = secondHalf.reduce((sum, d) => sum + (d.gula_darah || 0), 0) / secondHalf.length;
          
          if (avgSistolikSecond > avgSistolikFirst + 5) trenTekananDarah = 'Naik';
          else if (avgSistolikSecond < avgSistolikFirst - 5) trenTekananDarah = 'Turun';
          
          if (avgGulaSecond > avgGulaFirst + 10) trenGulaDarah = 'Naik';
          else if (avgGulaSecond < avgGulaFirst - 10) trenGulaDarah = 'Turun';
        }
        
        return {
          rataRataTekananSistolik: rows[0].rata_sistolik || 0,
          rataRataTekananDiastolik: rows[0].rata_diastolik || 0,
          rataRataGulaDarah: rows[0].rata_gula || 0,
          rataRataDetakJantung: rows[0].rata_detak || 0,
          trenTekananDarah,
          trenGulaDarah
        };
      } catch (error) {
        throw new Error('Error menghitung statistik: ' + error.message);
      }
    },
    
    // Get ringkasan kesehatan
    ringkasanKesehatan: async (_, { idLansia }, context) => {
      const user = checkAuth(context);
      
      // Check access
      const hasAccess = await canAccessLansia(user, idLansia, context.db);
      if (!hasAccess) {
        throw new Error('Anda tidak memiliki akses ke data lansia ini');
      }
      
      try {
        // Get pemantauan terakhir
        const [lastCheck] = await context.db.execute(
          `SELECT * FROM pemantauan_kesehatan 
           WHERE id_lansia = ? 
           ORDER BY tanggal_pemeriksaan DESC 
           LIMIT 1`,
          [idLansia]
        );
        
        // Get total pemantauan
        const [countResult] = await context.db.execute(
          'SELECT COUNT(*) as total FROM pemantauan_kesehatan WHERE id_lansia = ?',
          [idLansia]
        );
        
        const pemantauanTerakhir = lastCheck[0] || null;
        const alerts = [];
        let statusKesehatanUmum = 'Baik';
        
        if (pemantauanTerakhir) {
          // Check for alerts
          if (pemantauanTerakhir.tekanan_darah_sistolik >= 140 || pemantauanTerakhir.tekanan_darah_diastolik >= 90) {
            alerts.push('Tekanan darah tinggi - segera konsultasi dengan dokter');
            statusKesehatanUmum = 'Perlu Perhatian';
          }
          
          if (pemantauanTerakhir.gula_darah > 200) {
            alerts.push('Gula darah sangat tinggi - perlu penanganan segera');
            statusKesehatanUmum = 'Kritis';
          } else if (pemantauanTerakhir.gula_darah > 140) {
            alerts.push('Gula darah tinggi - monitor dengan ketat');
            if (statusKesehatanUmum === 'Baik') statusKesehatanUmum = 'Perlu Perhatian';
          }
          
          if (pemantauanTerakhir.detak_jantung && (pemantauanTerakhir.detak_jantung < 60 || pemantauanTerakhir.detak_jantung > 100)) {
            alerts.push('Detak jantung tidak normal');
            if (statusKesehatanUmum === 'Baik') statusKesehatanUmum = 'Perlu Perhatian';
          }
        }
        
        return {
          pemantauanTerakhir,
          totalPemantauan: countResult[0].total,
          statusKesehatanUmum,
          alertKesehatan: alerts
        };
      } catch (error) {
        throw new Error('Error mengambil ringkasan kesehatan: ' + error.message);
      }
    }
  },
  
  Mutation: {
    // Create pemantauan
    createPemantauan: async (_, { input }, context) => {
      const user = checkAuth(context);
      
      // Check access to lansia
      const hasAccess = await canAccessLansia(user, input.id_lansia, context.db);
      if (!hasAccess) {
        throw new Error('Anda tidak memiliki akses untuk menambah data pemantauan untuk lansia ini');
      }
      
      try {
        const pemantauanId = 'PMT' + uuidv4().substring(0, 8).toUpperCase();
        const tanggalPemeriksaan = input.tanggal_pemeriksaan || new Date().toISOString();
        
        await context.db.execute(
          `INSERT INTO pemantauan_kesehatan 
           (id_pemantauan_kesehatan, id_lansia, tekanan_darah_sistolik, tekanan_darah_diastolik,
            gula_darah, detak_jantung, suhu_tubuh, berat_badan, tinggi_badan, catatan, tanggal_pemeriksaan) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            pemantauanId,
            input.id_lansia,
            input.tekanan_darah_sistolik,
            input.tekanan_darah_diastolik,
            input.gula_darah,
            input.detak_jantung,
            input.suhu_tubuh,
            input.berat_badan,
            input.tinggi_badan,
            input.catatan,
            tanggalPemeriksaan
          ]
        );
        
        // Get created pemantauan
        const [newPemantauan] = await context.db.execute(
          'SELECT * FROM pemantauan_kesehatan WHERE id_pemantauan_kesehatan = ?',
          [pemantauanId]
        );
        
        return newPemantauan[0];
      } catch (error) {
        throw new Error('Error membuat data pemantauan: ' + error.message);
      }
    },
    
    // Update pemantauan
    updatePemantauan: async (_, { id, input }, context) => {
      const user = checkAuth(context);
      
      try {
        // Get existing pemantauan to check access
        const [existing] = await context.db.execute(
          'SELECT id_lansia FROM pemantauan_kesehatan WHERE id_pemantauan_kesehatan = ?',
          [id]
        );
        
        if (existing.length === 0) {
          throw new Error('Data pemantauan tidak ditemukan');
        }
        
        const hasAccess = await canAccessLansia(user, existing[0].id_lansia, context.db);
        if (!hasAccess) {
          throw new Error('Anda tidak memiliki akses untuk mengupdate data pemantauan ini');
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
          `UPDATE pemantauan_kesehatan SET ${updates.join(', ')} WHERE id_pemantauan_kesehatan = ?`,
          params
        );
        
        // Get updated pemantauan
        const [updatedPemantauan] = await context.db.execute(
          'SELECT * FROM pemantauan_kesehatan WHERE id_pemantauan_kesehatan = ?',
          [id]
        );
        
        return updatedPemantauan[0];
      } catch (error) {
        throw new Error('Error update data pemantauan: ' + error.message);
      }
    },
    
    // Delete pemantauan
    deletePemantauan: async (_, { id }, context) => {
      const user = checkAuth(context);
      
      try {
        // Get existing pemantauan to check access
        const [existing] = await context.db.execute(
          'SELECT id_lansia FROM pemantauan_kesehatan WHERE id_pemantauan_kesehatan = ?',
          [id]
        );
        
        if (existing.length === 0) {
          throw new Error('Data pemantauan tidak ditemukan');
        }
        
        const hasAccess = await canAccessLansia(user, existing[0].id_lansia, context.db);
        if (!hasAccess) {
          throw new Error('Anda tidak memiliki akses untuk menghapus data pemantauan ini');
        }
        
        const [result] = await context.db.execute(
          'DELETE FROM pemantauan_kesehatan WHERE id_pemantauan_kesehatan = ?',
          [id]
        );
        
        return result.affectedRows > 0;
      } catch (error) {
        throw new Error('Error hapus data pemantauan: ' + error.message);
      }
    },
    
    // Quick input vital signs
    quickInputVitalSigns: async (_, { idLansia, tekananSistolik, tekananDiastolik, gulaDarah }, context) => {
      const user = checkAuth(context);
      
      // Check access
      const hasAccess = await canAccessLansia(user, idLansia, context.db);
      if (!hasAccess) {
        throw new Error('Anda tidak memiliki akses untuk menambah data pemantauan untuk lansia ini');
      }
      
      try {
        const pemantauanId = 'PMT' + uuidv4().substring(0, 8).toUpperCase();
        
        await context.db.execute(
          `INSERT INTO pemantauan_kesehatan 
           (id_pemantauan_kesehatan, id_lansia, tekanan_darah_sistolik, tekanan_darah_diastolik, gula_darah) 
           VALUES (?, ?, ?, ?, ?)`,
          [pemantauanId, idLansia, tekananSistolik, tekananDiastolik, gulaDarah]
        );
        
        // Get created pemantauan
        const [newPemantauan] = await context.db.execute(
          'SELECT * FROM pemantauan_kesehatan WHERE id_pemantauan_kesehatan = ?',
          [pemantauanId]
        );
        
        return newPemantauan[0];
      } catch (error) {
        throw new Error('Error quick input vital signs: ' + error.message);
      }
    }
  },
  
  // Field resolvers
  PemantauanKesehatan: {
    // Get related lansia data
    lansia: async (parent, _, { db }) => {
      const [rows] = await db.execute(
        'SELECT * FROM lansia WHERE id_lansia = ?',
        [parent.id_lansia]
      );
      return rows[0];
    },
    
    // Computed field: tekanan darah lengkap
    tekananDarahLengkap: (parent) => {
      if (!parent.tekanan_darah_sistolik || !parent.tekanan_darah_diastolik) return null;
      return `${parent.tekanan_darah_sistolik}/${parent.tekanan_darah_diastolik} mmHg`;
    },
    
    // Computed field: status tekanan darah
    statusTekananDarah: (parent) => {
      if (!parent.tekanan_darah_sistolik || !parent.tekanan_darah_diastolik) return null;
      return evaluateBloodPressure(parent.tekanan_darah_sistolik, parent.tekanan_darah_diastolik);
    },
    
    // Computed field: status gula darah
    statusGulaDarah: (parent) => {
      if (!parent.gula_darah) return null;
      return evaluateBloodSugar(parent.gula_darah);
    },
    
    // Computed field: BMI
    bmi: (parent) => {
      return calculateBMI(parent.berat_badan, parent.tinggi_badan);
    },
    
    // Computed field: status BMI
    statusBmi: (parent) => {
      const bmi = calculateBMI(parent.berat_badan, parent.tinggi_badan);
      return evaluateBMI(bmi);
    }
  }
};

module.exports = pemantauanResolvers;
