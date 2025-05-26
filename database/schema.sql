-- database/schema.sql
-- Buat database
CREATE DATABASE IF NOT EXISTS lansia_monitoring;
USE lansia_monitoring;

-- Tabel Pengguna (base table untuk semua user)
CREATE TABLE pengguna (
    id_pengguna VARCHAR(50) PRIMARY KEY,
    nama VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    peran ENUM('lansia', 'keluarga', 'tenaga_medis', 'admin') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabel Lansia
CREATE TABLE lansia (
    id_lansia VARCHAR(50) PRIMARY KEY,
    id_pengguna VARCHAR(50) UNIQUE,
    nama VARCHAR(100) NOT NULL,
    usia INT NOT NULL,
    kondisi TEXT,
    alamat TEXT,
    tanggal_lahir DATE,
    golongan_darah VARCHAR(5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_pengguna) REFERENCES pengguna(id_pengguna) ON DELETE CASCADE
);

-- Tabel Keluarga
CREATE TABLE keluarga (
    id_keluarga VARCHAR(50) PRIMARY KEY,
    id_pengguna VARCHAR(50) UNIQUE,
    id_lansia VARCHAR(50),
    nama VARCHAR(100) NOT NULL,
    hubungan_dengan_lansia VARCHAR(50),
    nomor_telepon VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_pengguna) REFERENCES pengguna(id_pengguna) ON DELETE CASCADE,
    FOREIGN KEY (id_lansia) REFERENCES lansia(id_lansia) ON DELETE SET NULL
);

-- Tabel Tenaga Medis
CREATE TABLE tenaga_medis (
    id_tenaga_medis VARCHAR(50) PRIMARY KEY,
    id_pengguna VARCHAR(50) UNIQUE,
    nama VARCHAR(100) NOT NULL,
    spesialisasi VARCHAR(100),
    nomor_str VARCHAR(50),
    rumah_sakit VARCHAR(200),
    nomor_telepon VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_pengguna) REFERENCES pengguna(id_pengguna) ON DELETE CASCADE
);

-- Tabel Jadwal Konsumsi Obat
CREATE TABLE jadwal_konsumsi_obat (
    id_jadwal_konsumsi_obat VARCHAR(50) PRIMARY KEY,
    id_lansia VARCHAR(50) NOT NULL,
    obat VARCHAR(200) NOT NULL,
    dosis VARCHAR(100) NOT NULL,
    waktu TIME NOT NULL,
    frekuensi VARCHAR(50),
    tanggal_mulai DATE,
    tanggal_selesai DATE,
    catatan TEXT,
    status ENUM('aktif', 'selesai', 'dibatalkan') DEFAULT 'aktif',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_lansia) REFERENCES lansia(id_lansia) ON DELETE CASCADE
);

-- Tabel Pemantauan Kesehatan
CREATE TABLE pemantauan_kesehatan (
    id_pemantauan_kesehatan VARCHAR(50) PRIMARY KEY,
    id_lansia VARCHAR(50) NOT NULL,
    tekanan_darah_sistolik INT,
    tekanan_darah_diastolik INT,
    gula_darah FLOAT,
    detak_jantung INT,
    suhu_tubuh FLOAT,
    berat_badan FLOAT,
    tinggi_badan FLOAT,
    catatan TEXT,
    tanggal_pemeriksaan DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_lansia) REFERENCES lansia(id_lansia) ON DELETE CASCADE
);

-- Tabel Pengingat Perawatan
CREATE TABLE pengingat_perawatan (
    id_pengingat_perawatan VARCHAR(50) PRIMARY KEY,
    id_lansia VARCHAR(50) NOT NULL,
    jenis_perawatan VARCHAR(200) NOT NULL,
    waktu DATETIME NOT NULL,
    deskripsi TEXT,
    status ENUM('pending', 'selesai', 'terlewat') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_lansia) REFERENCES lansia(id_lansia) ON DELETE CASCADE
);

-- Tabel Konsultasi
CREATE TABLE konsultasi (
    id_konsultasi VARCHAR(50) PRIMARY KEY,
    id_lansia VARCHAR(50) NOT NULL,
    id_tenaga_medis VARCHAR(50) NOT NULL,
    id_keluarga VARCHAR(50),
    waktu DATETIME NOT NULL,
    status ENUM('dijadwalkan', 'berlangsung', 'selesai', 'dibatalkan') DEFAULT 'dijadwalkan',
    catatan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_lansia) REFERENCES lansia(id_lansia) ON DELETE CASCADE,
    FOREIGN KEY (id_tenaga_medis) REFERENCES tenaga_medis(id_tenaga_medis) ON DELETE CASCADE,
    FOREIGN KEY (id_keluarga) REFERENCES keluarga(id_keluarga) ON DELETE SET NULL
);

-- Tabel Chat Konsultasi (untuk fitur chat)
CREATE TABLE chat_konsultasi (
    id_chat VARCHAR(50) PRIMARY KEY,
    id_konsultasi VARCHAR(50) NOT NULL,
    id_pengirim VARCHAR(50) NOT NULL,
    pesan TEXT NOT NULL,
    waktu_kirim TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_konsultasi) REFERENCES konsultasi(id_konsultasi) ON DELETE CASCADE,
    FOREIGN KEY (id_pengirim) REFERENCES pengguna(id_pengguna) ON DELETE CASCADE
);

-- Tabel Laporan Kesehatan
CREATE TABLE laporan_kesehatan (
    id_laporan_kesehatan VARCHAR(50) PRIMARY KEY,
    id_lansia VARCHAR(50) NOT NULL,
    periode VARCHAR(50) NOT NULL,
    data JSON,
    ringkasan TEXT,
    tanggal_dibuat DATE DEFAULT (CURRENT_DATE),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_lansia) REFERENCES lansia(id_lansia) ON DELETE CASCADE
);

-- Tabel Kontak Darurat
CREATE TABLE kontak_darurat (
    id_kontak_darurat VARCHAR(50) PRIMARY KEY,
    id_lansia VARCHAR(50) NOT NULL,
    nama VARCHAR(100) NOT NULL,
    nomor VARCHAR(20) NOT NULL,
    hubungan VARCHAR(50),
    prioritas INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_lansia) REFERENCES lansia(id_lansia) ON DELETE CASCADE
);

-- Tabel Forum Diskusi
CREATE TABLE forum_diskusi (
    id_forum_diskusi VARCHAR(50) PRIMARY KEY,
    id_keluarga VARCHAR(50) NOT NULL,
    topik VARCHAR(200) NOT NULL,
    isi TEXT NOT NULL,
    status ENUM('aktif', 'tertutup') DEFAULT 'aktif',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_keluarga) REFERENCES keluarga(id_keluarga) ON DELETE CASCADE
);

-- Tabel Komentar Forum
CREATE TABLE komentar_forum (
    id_komentar VARCHAR(50) PRIMARY KEY,
    id_forum_diskusi VARCHAR(50) NOT NULL,
    id_pengguna VARCHAR(50) NOT NULL,
    komentar TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_forum_diskusi) REFERENCES forum_diskusi(id_forum_diskusi) ON DELETE CASCADE,
    FOREIGN KEY (id_pengguna) REFERENCES pengguna(id_pengguna) ON DELETE CASCADE
);

-- Indexes untuk performa
CREATE INDEX idx_lansia_pengguna ON lansia(id_pengguna);
CREATE INDEX idx_keluarga_lansia ON keluarga(id_lansia);
CREATE INDEX idx_jadwal_obat_lansia ON jadwal_konsumsi_obat(id_lansia);
CREATE INDEX idx_pemantauan_lansia ON pemantauan_kesehatan(id_lansia);
CREATE INDEX idx_konsultasi_lansia ON konsultasi(id_lansia);
CREATE INDEX idx_konsultasi_medis ON konsultasi(id_tenaga_medis);
CREATE INDEX idx_laporan_lansia ON laporan_kesehatan(id_lansia);
CREATE INDEX idx_kontak_lansia ON kontak_darurat(id_lansia);