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


-- Tabel untuk vital signs monitoring (hanya satu deklarasi)
CREATE TABLE vital_signs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    elderly_id INT NOT NULL,
    measurement_date DATETIME NOT NULL,
    blood_pressure_sys INT NOT NULL,
    blood_pressure_dia INT NOT NULL,
    heart_rate INT NOT NULL,
    blood_sugar INT,
    temperature DECIMAL(3,1),
    weight DECIMAL(5,2),
    notes TEXT,
    recorded_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (elderly_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id),
    INDEX idx_elderly_date (elderly_id, measurement_date)
);


-- Tabel untuk medications monitoring
CREATE TABLE medications_monitoring (
    id INT AUTO_INCREMENT PRIMARY KEY,
    elderly_id INT NOT NULL,
    medication_name VARCHAR(255) NOT NULL,
    dose VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    times VARCHAR(255) NOT NULL,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (elderly_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_elderly_active (elderly_id, is_active)
);


-- Tabel untuk medication logs
CREATE TABLE medication_monitoring_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    medication_id INT NOT NULL,
    taken_at DATETIME NOT NULL,
    marked_by INT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (medication_id) REFERENCES medications_monitoring(id) ON DELETE CASCADE,
    FOREIGN KEY (marked_by) REFERENCES users(id),
    INDEX idx_medication_date (medication_id, taken_at)
);


-- Tabel untuk activities
CREATE TABLE activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    elderly_id INT NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    activity_date DATETIME NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    description TEXT,
    recorded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (elderly_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id),
    INDEX idx_elderly_date_type (elderly_id, activity_date, activity_type)
);


-- Tabel untuk monitoring alerts
CREATE TABLE monitoring_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    elderly_id INT NOT NULL,
    alert_type VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    is_dismissed BOOLEAN DEFAULT FALSE,
    dismissed_by INT,
    dismissed_at DATETIME,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (elderly_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (dismissed_by) REFERENCES users(id),
    INDEX idx_elderly_dismissed (elderly_id, is_dismissed)
);


-- =============================================
-- INSERTS DATA (DENGAN PENYESUAIAN ID KONSISTEN)
-- =============================================


-- Insert user data (password: password123 untuk semua, kecuali admin)
INSERT INTO users (username, password, email, full_name, role, phone, address, date_of_birth) VALUES
('admin', '$2a$10$9EH0hvbO4GoxgxaaBReGl.3eSu32ihd401GoofyeSYpgjMBsRm0Ui', 'admin@lansia.com', 'Administrator', 'admin', '081234567890', NULL, NULL),
('keluarga1', '$2a$10$9EH0hvbO4GoxgxaaBReGl.3eSu32ihd401GoofyeSYpgjMBsRm0Ui', 'keluarga1@test.com', 'Budi Santoso', 'family', '081234567891', 'Jakarta', NULL),
('keluarga2', '$2a$10$9EH0hvbO4GoxgxaaBReGl.3eSu32ihd401GoofyeSYpgjMBsRm0Ui', 'keluarga2@test.com', 'Siti Rahayu', 'family', '081234567892', 'Bandung', NULL),
('lansia1', '$2a$10$9EH0hvbO4GoxgxaaBReGl.3eSu32ihd401GoofyeSYpgjMBsRm0Ui', 'lansia1@test.com', 'Kakek Suwarno', 'elderly', '081234567893', 'Jakarta', '1950-05-15'),
('lansia2', '$2a$10$9EH0hvbO4GoxgxaaBReGl.3eSu32ihd401GoofyeSYpgjMBsRm0Ui', 'lansia2@test.com', 'Nenek Siti', 'elderly', '081234567894', 'Jakarta', '1948-03-20'),
('lansia3', '$2a$10$9EH0hvbO4GoxgxaaBReGl.3eSu32ihd401GoofyeSYpgjMBsRm0Ui', 'lansia3@test.com', 'Kakek Ahmad', 'elderly', '081234567895', 'Bandung', '1952-11-10'),
('dokter1', '$2a$10$9EH0hvbO4GoxgxaaBReGl.3eSu32ihd401GoofyeSYpgjMBsRm0Ui', 'dokter1@test.com', 'Dr. Wijaya', 'medical', '081234567896', NULL, NULL),
('perawat1', '$2a$10$9EH0hvbO4GoxgxaaBReGl.3eSu32ihd401GoofyeSYpgjMBsRm0Ui', 'perawat1@test.com', 'Ns. Dewi', 'medical', '081234567897', NULL, NULL);


-- Hubungkan keluarga dengan lansia
INSERT INTO family_elderly_relations (family_user_id, elderly_user_id, relationship) VALUES
((SELECT id FROM users WHERE username = 'keluarga1'), (SELECT id FROM users WHERE username = 'lansia1'), 'Anak'),
((SELECT id FROM users WHERE username = 'keluarga1'), (SELECT id FROM users WHERE username = 'lansia2'), 'Anak'),
((SELECT id FROM users WHERE username = 'keluarga2'), (SELECT id FROM users WHERE username = 'lansia3'), 'Cucu');


-- Kontak darurat
INSERT INTO emergency_contacts (user_id, contact_name, contact_phone, relationship, priority) VALUES
((SELECT id FROM users WHERE username = 'lansia1'), 'Budi Santoso', '081234567891', 'Anak', 1),
((SELECT id FROM users WHERE username = 'lansia1'), 'Siti Rahayu', '081234567892', 'Menantu', 2);


-- Data obat
INSERT INTO medicines (user_id, medicine_name, dosage, frequency, time_schedule, start_date, notes) VALUES
((SELECT id FROM users WHERE username = 'lansia1'), 'Amlodipine', '5mg', '1x sehari', '08:00:00', CURDATE(), 'Untuk tekanan darah tinggi'),
((SELECT id FROM users WHERE username = 'lansia1'), 'Metformin', '500mg', '2x sehari', '08:00:00,20:00:00', CURDATE(), 'Untuk diabetes');


-- Rekam kesehatan
INSERT INTO health_records (user_id, blood_pressure_systolic, blood_pressure_diastolic, blood_sugar_level, heart_rate, temperature, weight, notes) VALUES
((SELECT id FROM users WHERE username = 'lansia1'), 130, 85, 110, 75, 36.5, 65.5, 'Pemeriksaan rutin'),
((SELECT id FROM users WHERE username = 'lansia1'), 128, 82, 105, 72, 36.6, 65.3, 'Kondisi stabil');


-- Appointment
INSERT INTO appointments (user_id, title, description, appointment_date, appointment_time, location, doctor_name, type) VALUES
((SELECT id FROM users WHERE username = 'lansia1'), 'Pemeriksaan Rutin', 'Pemeriksaan kesehatan bulanan', DATE_ADD(CURDATE(), INTERVAL 7 DAY), '09:00:00', 'RS Sehat Sejahtera', 'Dr. Wijaya', 'medical_checkup');


-- Data vital signs
INSERT INTO vital_signs (elderly_id, measurement_date, blood_pressure_sys, blood_pressure_dia, heart_rate, blood_sugar, temperature, weight, recorded_by) VALUES
((SELECT id FROM users WHERE username = 'lansia1'), NOW() - INTERVAL 1 DAY, 120, 80, 75, 100, 36.5, 65.5, (SELECT id FROM users WHERE username = 'admin')),
((SELECT id FROM users WHERE username = 'lansia1'), NOW() - INTERVAL 2 DAY, 125, 82, 78, 105, 36.6, 65.3, (SELECT id FROM users WHERE username = 'admin'));


-- Data monitoring obat
INSERT INTO medications_monitoring (elderly_id, medication_name, dose, frequency, times, created_by) VALUES
((SELECT id FROM users WHERE username = 'lansia1'), 'Amlodipine', '5mg', '1x sehari', '08:00', (SELECT id FROM users WHERE username = 'admin')),
((SELECT id FROM users WHERE username = 'lansia1'), 'Metformin', '500mg', '2x sehari', '08:00,20:00', (SELECT id FROM users WHERE username = 'admin'));


-- Log obat
INSERT INTO medication_monitoring_logs (medication_id, taken_at, marked_by) VALUES
((SELECT id FROM medications_monitoring WHERE medication_name = 'Amlodipine' AND elderly_id = (SELECT id FROM users WHERE username = 'lansia1')), NOW(), (SELECT id FROM users WHERE username = 'lansia1')),
((SELECT id FROM medications_monitoring WHERE medication_name = 'Metformin' AND elderly_id = (SELECT id FROM users WHERE username = 'lansia1')), NOW(), (SELECT id FROM users WHERE username = 'lansia1'));


-- Aktivitas
INSERT INTO activities (elderly_id, activity_type, activity_date, value, unit, description) VALUES
((SELECT id FROM users WHERE username = 'lansia1'), 'steps', NOW() - INTERVAL 1 HOUR, 1500, 'steps', 'Jalan pagi di taman'),
((SELECT id FROM users WHERE username = 'lansia1'), 'sleep', NOW() - INTERVAL 10 HOUR, 7.5, 'hours', 'Tidur malam');


-- Alert monitoring
INSERT INTO monitoring_alerts (elderly_id, alert_type, message, created_by) VALUES
((SELECT id FROM users WHERE username = 'lansia1'), 'medium', 'Tekanan darah sedikit tinggi pada pemeriksaan terakhir', (SELECT id FROM users WHERE username = 'admin'));