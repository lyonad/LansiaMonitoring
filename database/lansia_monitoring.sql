 -- Database: lansia_monitoring

CREATE DATABASE IF NOT EXISTS lansia_monitoring;
USE lansia_monitoring;

-- Tabel Users
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'family', 'medical', 'elderly') NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    date_of_birth DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabel untuk relasi keluarga-lansia
CREATE TABLE family_elderly_relations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    family_user_id INT,
    elderly_user_id INT,
    relationship VARCHAR(50),
    FOREIGN KEY (family_user_id) REFERENCES users(id),
    FOREIGN KEY (elderly_user_id) REFERENCES users(id),
    UNIQUE KEY unique_family_elderly (family_user_id, elderly_user_id)
);

-- Tabel Kontak Darurat
CREATE TABLE emergency_contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    contact_name VARCHAR(100) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    relationship VARCHAR(50),
    priority INT DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabel Obat
CREATE TABLE medicines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    medicine_name VARCHAR(100) NOT NULL,
    dosage VARCHAR(50),
    frequency VARCHAR(50),
    time_schedule TIME,
    start_date DATE,
    end_date DATE,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabel Riwayat Konsumsi Obat
CREATE TABLE medicine_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    medicine_id INT,
    taken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('taken', 'missed', 'postponed') DEFAULT 'taken',
    notes TEXT,
    FOREIGN KEY (medicine_id) REFERENCES medicines(id)
);

-- Tabel Rekam Kesehatan
CREATE TABLE health_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    blood_pressure_systolic INT,
    blood_pressure_diastolic INT,
    blood_sugar_level DECIMAL(5,2),
    weight DECIMAL(5,2),
    height DECIMAL(5,2),
    temperature DECIMAL(4,2),
    heart_rate INT,
    notes TEXT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabel Jadwal Perawatan/Appointment
CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    location VARCHAR(200),
    doctor_name VARCHAR(100),
    type ENUM('medical_checkup', 'therapy', 'consultation', 'other') DEFAULT 'medical_checkup',
    status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
    reminder_sent BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabel Chat
CREATE TABLE chats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT,
    receiver_id INT,
    message TEXT,
    attachment_url VARCHAR(255),
    attachment_type ENUM('image', 'video', 'document'),
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);

-- Tabel Forum Diskusi
CREATE TABLE forum_posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabel Komentar Forum
CREATE TABLE forum_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT,
    user_id INT,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES forum_posts(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabel Notifikasi
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    type VARCHAR(50),
    title VARCHAR(200),
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Tabel Log Aktivitas (untuk keamanan)
CREATE TABLE activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100),
    description TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Insert data awal admin
INSERT INTO users (username, password, email, full_name, role) 
VALUES ('admin', '$2b$10$YourHashedPasswordHere', 'admin@lansiamonitoring.com', 'Administrator', 'admin');
