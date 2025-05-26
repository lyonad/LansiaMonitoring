-- database/seed.sql
USE lansia_monitoring;

-- Insert Pengguna
-- Password: password123 (hashed dengan bcrypt)
INSERT INTO pengguna (id_pengguna, nama, email, password, peran) VALUES
('USR001', 'Siti Rahma', 'siti.rahma@email.com', '$2b$10$YourHashedPasswordHere', 'lansia'),
('USR002', 'Budi Santoso', 'budi.santoso@email.com', '$2b$10$YourHashedPasswordHere', 'lansia'),
('USR003', 'Ahmad Keluarga', 'ahmad.kel@email.com', '$2b$10$YourHashedPasswordHere', 'keluarga'),
('USR004', 'Rina Keluarga', 'rina.kel@email.com', '$2b$10$YourHashedPasswordHere', 'keluarga'),
('USR005', 'Dr. Andi Wijaya', 'dr.andi@email.com', '$2b$10$YourHashedPasswordHere', 'tenaga_medis'),
('USR006', 'Dr. Maya Putri', 'dr.maya@email.com', '$2b$10$YourHashedPasswordHere', 'tenaga_medis'),
('USR007', 'Admin', 'admin@email.com', '$2b$10$YourHashedPasswordHere', 'admin');

-- Insert Lansia
INSERT INTO lansia (id_lansia, id_pengguna, nama, usia, kondisi, alamat, tanggal_lahir, golongan_darah) VALUES
('LNS001', 'USR001', 'Siti Rahma', 70, 'Diabetes Tipe 2, Hipertensi', 'Jl. Pahlawan No. 123, Semarang', '1955-03-15', 'B+'),
('LNS002', 'USR002', 'Budi Santoso', 68, 'Hipertensi', 'Jl. Merdeka No. 45, Semarang', '1957-07-20', 'O+');

-- Insert Keluarga
INSERT INTO keluarga (id_keluarga, id_pengguna, id_lansia, nama, hubungan_dengan_lansia, nomor_telepon) VALUES
('KEL001', 'USR003', 'LNS001', 'Ahmad Keluarga', 'Anak', '081234567890'),
('KEL002', 'USR004', 'LNS002', 'Rina Keluarga', 'Anak', '089876543210');

-- Insert Tenaga Medis
INSERT INTO tenaga_medis (id_tenaga_medis, id_pengguna, nama, spesialisasi, nomor_str, rumah_sakit, nomor_telepon) VALUES
('MED001', 'USR005', 'Dr. Andi Wijaya', 'Penyakit Dalam', 'STR123456', 'RS Kariadi Semarang', '081111222333'),
('MED002', 'USR006', 'Dr. Maya Putri', 'Geriatri', 'STR789012', 'RS Elisabeth Semarang', '082222333444');

-- Insert Jadwal Konsumsi Obat
INSERT INTO jadwal_konsumsi_obat (id_jadwal_konsumsi_obat, id_lansia, obat, dosis, waktu, frekuensi, tanggal_mulai, tanggal_selesai, catatan) VALUES
('JDW001', 'LNS001', 'Metformin', '500mg', '08:00:00', '2x sehari', '2025-05-01', '2025-06-01', 'Diminum setelah makan'),
('JDW002', 'LNS001', 'Amlodipine', '5mg', '20:00:00', '1x sehari', '2025-05-01', '2025-06-01', 'Diminum sebelum tidur'),
('JDW003', 'LNS002', 'Captopril', '25mg', '08:00:00', '2x sehari', '2025-05-01', '2025-06-01', 'Diminum sebelum makan');

-- Insert Pemantauan Kesehatan
INSERT INTO pemantauan_kesehatan (id_pemantauan_kesehatan, id_lansia, tekanan_darah_sistolik, tekanan_darah_diastolik, gula_darah, detak_jantung, suhu_tubuh, berat_badan, tinggi_badan, catatan) VALUES
('PMT001', 'LNS001', 140, 90, 180, 80, 36.5, 65, 160, 'Tekanan darah sedikit tinggi, gula darah perlu dikontrol'),
('PMT002', 'LNS001', 130, 85, 150, 75, 36.6, 65, 160, 'Kondisi membaik dari pemeriksaan sebelumnya'),
('PMT003', 'LNS002', 150, 95, 110, 85, 36.4, 70, 165, 'Tekanan darah tinggi, perlu konsultasi dokter');

-- Insert Pengingat Perawatan
INSERT INTO pengingat_perawatan (id_pengingat_perawatan, id_lansia, jenis_perawatan, waktu, deskripsi) VALUES
('PNG001', 'LNS001', 'Kontrol Rutin', '2025-06-01 09:00:00', 'Kontrol bulanan ke dokter penyakit dalam'),
('PNG002', 'LNS001', 'Cek Gula Darah', '2025-05-28 07:00:00', 'Cek gula darah puasa'),
('PNG003', 'LNS002', 'Kontrol Tekanan Darah', '2025-05-30 10:00:00', 'Kontrol tekanan darah rutin');

-- Insert Konsultasi
INSERT INTO konsultasi (id_konsultasi, id_lansia, id_tenaga_medis, id_keluarga, waktu, status, catatan) VALUES
('KON001', 'LNS001', 'MED001', 'KEL001', '2025-05-30 10:00:00', 'dijadwalkan', 'Konsultasi rutin bulanan'),
('KON002', 'LNS002', 'MED002', 'KEL002', '2025-05-29 14:00:00', 'dijadwalkan', 'Konsultasi tekanan darah tinggi');

-- Insert Kontak Darurat
INSERT INTO kontak_darurat (id_kontak_darurat, id_lansia, nama, nomor, hubungan, prioritas) VALUES
('KDR001', 'LNS001', 'Ahmad Keluarga', '081234567890', 'Anak', 1),
('KDR002', 'LNS001', 'RS Kariadi', '024-8413476', 'Rumah Sakit', 2),
('KDR003', 'LNS002', 'Rina Keluarga', '089876543210', 'Anak', 1);

-- Insert Forum Diskusi
INSERT INTO forum_diskusi (id_forum_diskusi, id_keluarga, topik, isi) VALUES
('FRM001', 'KEL001', 'Tips Merawat Lansia dengan Diabetes', 'Halo semua, ada yang punya tips merawat orang tua dengan diabetes? Ibu saya baru didiagnosis diabetes tipe 2.'),
('FRM002', 'KEL002', 'Cara Mengontrol Tekanan Darah Tinggi', 'Bagaimana cara efektif mengontrol tekanan darah tinggi pada lansia? Mohon sharingnya.');

-- Insert Komentar Forum
INSERT INTO komentar_forum (id_komentar, id_forum_diskusi, id_pengguna, komentar) VALUES
('KMN001', 'FRM001', 'USR004', 'Halo, pengalaman saya yang penting adalah menjaga pola makan dan olahraga ringan rutin.'),
('KMN002', 'FRM001', 'USR005', 'Sebagai dokter, saya sarankan kontrol gula darah rutin dan patuhi jadwal obat.'),
('KMN003', 'FRM002', 'USR003', 'Kurangi garam, perbanyak sayur dan buah, serta rutin cek tekanan darah.');

-- Insert Laporan Kesehatan
INSERT INTO laporan_kesehatan (id_laporan_kesehatan, id_lansia, periode, data, ringkasan) VALUES
('LAP001', 'LNS001', 'Mei 2025', '{"tekanan_darah_rata":"135/87", "gula_darah_rata":"165", "kepatuhan_obat":"85%"}', 'Kondisi stabil, gula darah perlu lebih dikontrol'),
('LAP002', 'LNS002', 'Mei 2025', '{"tekanan_darah_rata":"145/92", "kepatuhan_obat":"90%"}', 'Tekanan darah masih tinggi, perlu penyesuaian dosis obat');