-- Database Lansia Monitoring System
DROP DATABASE IF EXISTS lansia_monitoring;
CREATE DATABASE lansia_monitoring;
USE lansia_monitoring;

-- ================================================================
-- CORE TABLES
-- ================================================================

-- Users Table
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
    profile_image VARCHAR(255),
    blood_type ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
    medical_conditions TEXT,
    allergies TEXT,
    preferred_hospital VARCHAR(200),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_user_role (role),
    INDEX idx_user_active (is_active)
);

-- Family-Elderly Relations
CREATE TABLE family_elderly_relations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    family_user_id INT NOT NULL,
    elderly_user_id INT NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (elderly_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_family_elderly (family_user_id, elderly_user_id),
    INDEX idx_elderly (elderly_user_id),
    INDEX idx_family (family_user_id)
);

-- Medical Staff Assignment
CREATE TABLE medical_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    medical_id INT NOT NULL,
    elderly_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    FOREIGN KEY (medical_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (elderly_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id),
    UNIQUE KEY unique_medical_elderly (medical_id, elderly_id),
    INDEX idx_medical_active (medical_id, is_active),
    INDEX idx_elderly_active (elderly_id, is_active)
);

-- Emergency Contacts
CREATE TABLE emergency_contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    contact_name VARCHAR(100) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    relationship VARCHAR(50),
    priority INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_priority (user_id, priority)
);

-- ================================================================
-- HEALTH MONITORING TABLES
-- ================================================================

-- Vital Signs
CREATE TABLE vital_signs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    elderly_id INT NOT NULL,
    measurement_date DATETIME NOT NULL,
    blood_pressure_sys INT,
    blood_pressure_dia INT,
    heart_rate INT,
    blood_sugar DECIMAL(5,2),
    blood_sugar_type ENUM('fasting', 'post_meal', 'random'),
    temperature DECIMAL(4,2),
    weight DECIMAL(5,2),
    height DECIMAL(5,2),
    oxygen_saturation DECIMAL(5,2),
    notes TEXT,
    recorded_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (elderly_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id),
    INDEX idx_elderly_date (elderly_id, measurement_date),
    INDEX idx_recorded_by (recorded_by),
    CONSTRAINT vital_range_check CHECK (
        (blood_pressure_sys IS NULL OR (blood_pressure_sys >= 70 AND blood_pressure_sys <= 250)) AND
        (blood_pressure_dia IS NULL OR (blood_pressure_dia >= 40 AND blood_pressure_dia <= 150)) AND
        (heart_rate IS NULL OR (heart_rate >= 30 AND heart_rate <= 200)) AND
        (blood_sugar IS NULL OR (blood_sugar >= 30 AND blood_sugar <= 500)) AND
        (temperature IS NULL OR (temperature >= 30 AND temperature <= 45)) AND
        (oxygen_saturation IS NULL OR (oxygen_saturation >= 70 AND oxygen_saturation <= 100))
    )
);

-- Custom Vital Thresholds
CREATE TABLE vital_thresholds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    elderly_id INT NOT NULL,
    sys_min INT DEFAULT 90,
    sys_max INT DEFAULT 140,
    dia_min INT DEFAULT 60,
    dia_max INT DEFAULT 90,
    heart_rate_min INT DEFAULT 60,
    heart_rate_max INT DEFAULT 100,
    blood_sugar_fasting_min DECIMAL(5,2) DEFAULT 70.00,
    blood_sugar_fasting_max DECIMAL(5,2) DEFAULT 125.00,
    blood_sugar_post_meal_min DECIMAL(5,2) DEFAULT 70.00,
    blood_sugar_post_meal_max DECIMAL(5,2) DEFAULT 180.00,
    temperature_min DECIMAL(4,2) DEFAULT 36.00,
    temperature_max DECIMAL(4,2) DEFAULT 37.50,
    oxygen_min DECIMAL(5,2) DEFAULT 95.00,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (elderly_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE KEY unique_threshold (elderly_id)
);

-- Activity Tracking
CREATE TABLE activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    elderly_id INT NOT NULL,
    activity_type ENUM('steps', 'sleep', 'water', 'exercise', 'meal', 'medication', 'social', 'other') NOT NULL,
    activity_date DATETIME NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    description TEXT,
    images VARCHAR(255),
    mood ENUM('excellent', 'good', 'neutral', 'bad', 'terrible'),
    recorded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (elderly_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id),
    INDEX idx_elderly_date_type (elderly_id, activity_date, activity_type),
    INDEX idx_elderly_type (elderly_id, activity_type),
    INDEX idx_recorded_by (recorded_by)
);

-- Activity Schedule
CREATE TABLE activity_schedule (
    id INT AUTO_INCREMENT PRIMARY KEY,
    elderly_id INT NOT NULL,
    activity_type ENUM('medication', 'exercise', 'water', 'meal', 'checkup', 'other') NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    schedule_time TIME NOT NULL,
    days_of_week VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    reminder_enabled BOOLEAN DEFAULT TRUE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (elderly_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_elderly_active (elderly_id, is_active),
    INDEX idx_schedule (schedule_time, days_of_week)
);

-- ================================================================
-- MEDICINE MANAGEMENT TABLES
-- ================================================================

-- Medicines
CREATE TABLE medicines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    elderly_id INT NOT NULL,
    medicine_name VARCHAR(100) NOT NULL,
    dosage VARCHAR(50) NOT NULL,
    frequency VARCHAR(50) NOT NULL,
    time_schedule VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    notes TEXT,
    image_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    reminder_enabled BOOLEAN DEFAULT TRUE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (elderly_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_elderly_active (elderly_id, is_active),
    INDEX idx_start_end (start_date, end_date),
    INDEX idx_medicine_reminder (is_active, reminder_enabled)
);

-- Medicine Logs
CREATE TABLE medicine_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    medicine_id INT NOT NULL,
    taken_at DATETIME NOT NULL,
    status ENUM('taken', 'missed', 'postponed', 'skipped') DEFAULT 'taken',
    marked_by INT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE,
    FOREIGN KEY (marked_by) REFERENCES users(id),
    INDEX idx_medicine_date (medicine_id, taken_at),
    INDEX idx_medicine_status (medicine_id, status)
);

-- ================================================================
-- APPOINTMENT AND SCHEDULE TABLES
-- ================================================================

-- Appointments
CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    elderly_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    end_time TIME,
    location VARCHAR(200),
    location_coordinates VARCHAR(100),
    doctor_name VARCHAR(100),
    doctor_id INT,
    type ENUM('medical_checkup', 'therapy', 'consultation', 'other') DEFAULT 'medical_checkup',
    status ENUM('scheduled', 'completed', 'cancelled', 'missed') DEFAULT 'scheduled',
    reminder_sent BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (elderly_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_elderly_date (elderly_id, appointment_date),
    INDEX idx_status (status)
);

-- ================================================================
-- COMMUNICATION TABLES
-- ================================================================

-- Chat
CREATE TABLE chats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    message TEXT,
    attachment_url VARCHAR(255),
    attachment_type ENUM('image', 'video', 'document', 'audio'),
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sender (sender_id),
    INDEX idx_receiver (receiver_id),
    INDEX idx_unread (receiver_id, is_read)
);

-- Forum Posts
CREATE TABLE forum_posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50),
    image_url VARCHAR(255),
    is_pinned BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT TRUE,
    views_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_category (category),
    INDEX idx_pinned_approved (is_pinned, is_approved),
    INDEX idx_created_at (created_at)
);

-- Forum Comments
CREATE TABLE forum_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    comment TEXT NOT NULL,
    parent_id INT,
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES forum_comments(id) ON DELETE SET NULL,
    INDEX idx_post (post_id),
    INDEX idx_parent (parent_id)
);

-- ================================================================
-- NOTIFICATION AND ALERT TABLES
-- ================================================================

-- Notifications
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    priority ENUM('low', 'normal', 'high') DEFAULT 'normal',
    related_entity VARCHAR(50),
    entity_id INT,
    action_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_read (user_id, is_read),
    INDEX idx_created_at (created_at),
    INDEX idx_priority (priority)
);

-- Monitoring Alerts
CREATE TABLE monitoring_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    elderly_id INT NOT NULL,
    alert_type ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    category ENUM('vital_signs', 'medication', 'appointment', 'activity', 'other') NOT NULL,
    message TEXT NOT NULL,
    is_dismissed BOOLEAN DEFAULT FALSE,
    dismissed_by INT,
    dismissed_at DATETIME,
    requires_action BOOLEAN DEFAULT FALSE,
    action_description TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (elderly_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (dismissed_by) REFERENCES users(id),
    INDEX idx_elderly_dismissed (elderly_id, is_dismissed),
    INDEX idx_category_type (category, alert_type),
    INDEX idx_created_at (created_at)
);

-- ================================================================
-- REPORT AND LOGGING TABLES
-- ================================================================

-- Health Reports (with nullable elderly_id for overall reports)
CREATE TABLE health_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    elderly_id INT NULL,
    report_type ENUM('daily', 'weekly', 'monthly', 'custom', 'overall') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    report_data JSON,
    report_url VARCHAR(255),
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (elderly_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_elderly_dates (elderly_id, start_date, end_date)
);

-- Activity Logs
CREATE TABLE activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    entity_type VARCHAR(50),
    entity_id INT,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at),
    INDEX idx_entity (entity_type, entity_id)
);

-- ================================================================
-- SYSTEM CONFIGURATION TABLES
-- ================================================================

-- System Settings
CREATE TABLE system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- FAQ
CREATE TABLE faqs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(50),
    is_published BOOLEAN DEFAULT TRUE,
    view_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_published_order (is_published, view_order)
);

-- ================================================================
-- INITIAL DATA SEEDING
-- ================================================================

-- Admin User (password: password123)
INSERT INTO users (username, password, email, full_name, role) VALUES 
('admin', '$2a$10$9EH0hvbO4GoxgxaaBReGl.3eSu32ihd401GoofyeSYpgjMBsRm0Ui', 'admin@lansia.com', 'Administrator', 'admin'),
('superadmin', '$2a$10$9EH0hvbO4GoxgxaaBReGl.3eSu32ihd401GoofyeSYpgjMBsRm0Ui', 'superadmin@lansia.com', 'Super Administrator', 'admin');

-- Medical Staff Users
INSERT INTO users (username, password, email, full_name, role, phone, address, date_of_birth, blood_type) VALUES
('dr.wijaya', '$2a$10$9EH0hvbO4GoxgxaaBReGl.3eSu32ihd401GoofyeSYpgjMBsRm0Ui', 'dr.wijaya@hospital.com', 'Dr. Budi Wijaya', 'medical', '081234567890', 'Jl. Kesehatan No. 10, Jakarta', '1980-05-15', 'O+'),
('dr.siti', '$2a$10$9EH0hvbO4GoxgxaaBReGl.3eSu32ihd401GoofyeSYpgjMBsRm0Ui', 'dr.siti@hospital.com', 'Dr. Siti Aminah', 'medical', '081234567891', 'Jl. Sehat No. 25, Jakarta', '1985-08-20', 'A+'),
('perawat.dewi', '$2a$10$9EH0hvbO4GoxgxaaBReGl.3eSu32ihd401GoofyeSYpgjMBsRm0Ui', 'dewi@hospital.com', 'Ns. Dewi Pertiwi', 'medical', '081234567892', 'Jl. Asoka 5, Jakarta', '1990-03-12', 'B+'),
('perawat.anton', '$2a$10$9EH0hvbO4GoxgxaaBReGl.3eSu32ihd401GoofyeSYpgjMBsRm0Ui', 'anton@hospital.com', 'Ns. Anton Wijaya', 'medical', '081234567893', 'Jl. Kenanga 8, Jakarta', '1988-11-30', 'AB-');

-- Elderly Users
INSERT INTO users (username, password, email, full_name, role, phone, address, date_of_birth, blood_type, medical_conditions, allergies, preferred_hospital, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship) VALUES
('suwarno', '$2a$10$9EH0hvbO4GoxgxaaBReGl.3eSu32ihd401GoofyeSYpgjMBsRm0Ui', 'suwarno@email.com', 'Suwarno Hadi', 'elderly', '081345678901', 'Jl. Melati No. 7, Jakarta', '1950-05-15', 'A+', 'Hipertensi, Diabetes tipe 2', 'Penisilin', 'RS Harapan Bunda', 'Budi Santoso', '081234567895', 'Anak'),
('sutinem', '$2a$10$9EH0hvbO4GoxgxaaBReGl.3eSu32ihd401GoofyeSYpgjMBsRm0Ui', 'sutinem@email.com', 'Sutinem Wati', 'elderly', '081345678902', 'Jl. Melati No. 7, Jakarta', '1952-09-23', 'A+', 'Hipertensi, Osteoporosis', 'Seafood', 'RS Harapan Bunda', 'Budi Santoso', '081234567895', 'Anak'),
('ahmad', '$2a$10$9EH0hvbO4GoxgxaaBReGl.3eSu32ihd401GoofyeSYpgjMBsRm0Ui', 'ahmad@email.com', 'Ahmad Rusli', 'elderly', '081345678903', 'Jl. Cendana No. 12, Bandung', '1948-03-10', 'O+', 'Asam urat, Kolesterol tinggi', NULL, 'RS Santo Borromeus', 'Sinta Dewi', '081234567896', 'Anak'),
('rukmini', '$2a$10$9EH0hvbO4GoxgxaaBReGl.3eSu32ihd401GoofyeSYpgjMBsRm0Ui', 'rukmini@email.com', 'Rukmini Hartono', 'elderly', '081345678904', 'Jl. Anggrek No. 5, Surabaya', '1953-11-27', 'B+', 'Asma, Radang sendi', 'Debu, Kacang', 'RS Premier Surabaya', 'Anton Hartono', '081234567897', 'Anak'),
('junaedi', '$2a$10$9EH0hvbO4GoxgxaaBReGl.3eSu32ihd401GoofyeSYpgjMBsRm0Ui', 'junaedi@email.com', 'Junaedi Priyanto', 'elderly', '081345678905', 'Jl. Kamboja No. 3, Jakarta', '1946-08-17', 'AB-', 'Parkinson ringan, Hipertensi', 'Sulfa', 'RSPAD Gatot Soebroto', 'Ratna Sari', '081234567898', 'Anak');

-- Family Users
INSERT INTO users (username, password, email, full_name, role, phone, address, date_of_birth, blood_type) VALUES
('budi', '$2a$10$9EH0hvbO4GoxgxaaBReGl.3eSu32ihd401GoofyeSYpgjMBsRm0Ui', 'budi@email.com', 'Budi Santoso', 'family', '081234567895', 'Jl. Dahlia No. 15, Jakarta', '1975-12-10', 'A+'),
('sinta', '$2a$10$9EH0hvbO4GoxgxaaBReGl.3eSu32ihd401GoofyeSYpgjMBsRm0Ui', 'sinta@email.com', 'Sinta Dewi', 'family', '081234567896', 'Jl. Flamboyan No. 8, Bandung', '1980-06-15', 'O+'),
('anton', '$2a$10$9EH0hvbO4GoxgxaaBReGl.3eSu32ihd401GoofyeSYpgjMBsRm0Ui', 'anton@email.com', 'Anton Hartono', 'family', '081234567897', 'Jl. Kutilang No. 9, Surabaya', '1973-04-20', 'B+'),
('ratna', '$2a$10$9EH0hvbO4GoxgxaaBReGl.3eSu32ihd401GoofyeSYpgjMBsRm0Ui', 'ratna@email.com', 'Ratna Sari', 'family', '081234567898', 'Jl. Merpati No. 11, Jakarta', '1978-09-05', 'AB+'),
('maya', '$2a$10$9EH0hvbO4GoxgxaaBReGl.3eSu32ihd401GoofyeSYpgjMBsRm0Ui', 'maya@email.com', 'Maya Wijaya', 'family', '081234567899', 'Jl. Kenari No. 7, Jakarta', '1982-02-28', 'A-');

-- Family-Elderly Relations
INSERT INTO family_elderly_relations (family_user_id, elderly_user_id, relationship, is_primary) 
SELECT f.id, e.id, r.relationship, r.is_primary
FROM (VALUES 
    ('budi', 'suwarno', 'Anak', TRUE),
    ('budi', 'sutinem', 'Anak', TRUE),
    ('sinta', 'ahmad', 'Anak', TRUE),
    ('anton', 'rukmini', 'Anak', TRUE),
    ('ratna', 'junaedi', 'Anak', TRUE),
    ('maya', 'suwarno', 'Menantu', FALSE),
    ('maya', 'sutinem', 'Menantu', FALSE)
) AS r(family_username, elderly_username, relationship, is_primary)
JOIN users f ON f.username = r.family_username
JOIN users e ON e.username = r.elderly_username;

-- Emergency Contacts for Elderly
INSERT INTO emergency_contacts (user_id, contact_name, contact_phone, relationship, priority) 
SELECT u.id, e.contact_name, e.contact_phone, e.relationship, e.priority
FROM (VALUES
    ('suwarno', 'Budi Santoso', '081234567895', 'Anak', 1),
    ('suwarno', 'RS Harapan Bunda', '021-7654321', 'Rumah Sakit', 2),
    ('sutinem', 'Budi Santoso', '081234567895', 'Anak', 1),
    ('sutinem', 'RS Harapan Bunda', '021-7654321', 'Rumah Sakit', 2),
    ('ahmad', 'Sinta Dewi', '081234567896', 'Anak', 1),
    ('ahmad', 'Dr. Budi Wijaya', '081234567890', 'Dokter', 2),
    ('rukmini', 'Anton Hartono', '081234567897', 'Anak', 1),
    ('rukmini', 'Klinik 24 Jam Sehat', '031-8765432', 'Klinik', 2),
    ('junaedi', 'Ratna Sari', '081234567898', 'Anak', 1),
    ('junaedi', 'Dr. Siti Aminah', '081234567891', 'Dokter', 2)
) AS e(username, contact_name, contact_phone, relationship, priority)
JOIN users u ON u.username = e.username;

-- Medical Assignments
INSERT INTO medical_assignments (medical_id, elderly_id, assigned_by, notes) 
SELECT m.id, e.id, a.id, ma.notes
FROM (VALUES
    ('dr.wijaya', 'suwarno', 'admin', 'Dokter utama'),
    ('dr.wijaya', 'sutinem', 'admin', 'Dokter utama'),
    ('dr.siti', 'ahmad', 'admin', 'Dokter utama'),
    ('dr.siti', 'rukmini', 'admin', 'Dokter utama'),
    ('dr.siti', 'junaedi', 'admin', 'Dokter utama'),
    ('perawat.dewi', 'suwarno', 'admin', 'Perawat pendamping'),
    ('perawat.dewi', 'sutinem', 'admin', 'Perawat pendamping'),
    ('perawat.anton', 'ahmad', 'admin', 'Perawat pendamping'),
    ('perawat.anton', 'rukmini', 'admin', 'Perawat pendamping'),
    ('perawat.anton', 'junaedi', 'admin', 'Perawat pendamping')
) AS ma(medical_username, elderly_username, assigned_by_username, notes)
JOIN users m ON m.username = ma.medical_username
JOIN users e ON e.username = ma.elderly_username
JOIN users a ON a.username = ma.assigned_by_username;

-- Vital Thresholds for Elderly
INSERT INTO vital_thresholds (elderly_id, sys_min, sys_max, dia_min, dia_max, heart_rate_min, heart_rate_max, blood_sugar_fasting_min, blood_sugar_fasting_max, temperature_min, temperature_max, created_by) 
SELECT e.id, vt.sys_min, vt.sys_max, vt.dia_min, vt.dia_max, vt.heart_rate_min, vt.heart_rate_max, vt.blood_sugar_fasting_min, vt.blood_sugar_fasting_max, vt.temperature_min, vt.temperature_max, c.id
FROM (VALUES
    ('suwarno', 100, 150, 60, 90, 55, 95, 80, 140, 36.0, 37.5, 'dr.wijaya'),
    ('sutinem', 95, 145, 60, 85, 60, 100, 80, 130, 36.0, 37.5, 'dr.wijaya'),
    ('ahmad', 100, 140, 65, 90, 60, 100, 75, 130, 36.0, 37.5, 'dr.siti'),
    ('rukmini', 90, 140, 60, 85, 60, 100, 80, 130, 36.0, 37.5, 'dr.siti'),
    ('junaedi', 110, 150, 65, 95, 55, 95, 85, 140, 36.0, 37.5, 'dr.siti')
) AS vt(elderly_username, sys_min, sys_max, dia_min, dia_max, heart_rate_min, heart_rate_max, blood_sugar_fasting_min, blood_sugar_fasting_max, temperature_min, temperature_max, created_by_username)
JOIN users e ON e.username = vt.elderly_username
JOIN users c ON c.username = vt.created_by_username;

-- System Settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('app_name', 'LansiaMonitoring', 'string', 'Nama aplikasi'),
('app_description', 'Sistem Monitoring Kesehatan Lansia', 'string', 'Deskripsi aplikasi'),
('admin_email', 'admin@lansia.com', 'string', 'Email administrator untuk notifikasi sistem'),
('enable_email_notifications', 'false', 'boolean', 'Aktifkan notifikasi email'),
('enable_sms_notifications', 'false', 'boolean', 'Aktifkan notifikasi SMS'),
('max_file_upload_size', '5', 'number', 'Ukuran maksimum file upload dalam MB'),
('vital_check_reminder_days', '3', 'number', 'Batas hari untuk pengingat pemeriksaan vital'),
('appointment_reminder_hours', '24', 'number', 'Jam sebelum janji temu untuk mengirim pengingat'),
('medicine_reminder_minutes', '30', 'number', 'Menit sebelum jadwal obat untuk mengirim pengingat'),
('default_blood_pressure_threshold_high', '140/90', 'string', 'Ambang batas tekanan darah tinggi default'),
('default_blood_pressure_threshold_critical', '180/110', 'string', 'Ambang batas tekanan darah kritis default'),
('enable_public_registration', 'false', 'boolean', 'Mengizinkan pendaftaran publik tanpa persetujuan admin'),
('maintenance_mode', 'false', 'boolean', 'Mode pemeliharaan sistem'),
('version', '1.0.0', 'string', 'Versi aplikasi'),
('contact_email', 'support@lansiamonitoring.com', 'string', 'Email kontak dukungan'),
('help_phone', '021-5550199', 'string', 'Nomor telepon bantuan'),
('privacy_policy_last_updated', '2023-08-01', 'string', 'Tanggal terakhir update kebijakan privasi');

-- ================================================================
-- SAMPLE OPERATIONAL DATA
-- ================================================================

-- Vital Signs Sample Data
INSERT INTO vital_signs (elderly_id, measurement_date, blood_pressure_sys, blood_pressure_dia, heart_rate, blood_sugar, blood_sugar_type, temperature, weight, oxygen_saturation, notes, recorded_by) 
SELECT e.id, v.measurement_date, v.bp_sys, v.bp_dia, v.heart_rate, v.blood_sugar, v.blood_sugar_type, v.temperature, v.weight, v.oxygen_saturation, v.notes, r.id
FROM (VALUES
    ('suwarno', DATE_SUB(NOW(), INTERVAL 7 DAY), 145, 85, 78, 130, 'fasting', 36.5, 68.5, 97, 'Stabil', 'dr.wijaya'),
    ('suwarno', DATE_SUB(NOW(), INTERVAL 5 DAY), 150, 90, 82, 145, 'fasting', 36.7, 68.2, 96, 'Gula darah naik', 'perawat.dewi'),
    ('suwarno', DATE_SUB(NOW(), INTERVAL 3 DAY), 148, 88, 76, 135, 'fasting', 36.4, 68.0, 97, 'Kondisi membaik', 'budi'),
    ('suwarno', DATE_SUB(NOW(), INTERVAL 1 DAY), 140, 85, 75, 125, 'fasting', 36.5, 67.8, 98, 'Kondisi stabil', 'budi'),
    ('sutinem', DATE_SUB(NOW(), INTERVAL 7 DAY), 138, 82, 76, 110, 'fasting', 36.3, 58.5, 98, 'Kondisi baik', 'dr.wijaya'),
    ('sutinem', DATE_SUB(NOW(), INTERVAL 5 DAY), 142, 84, 78, 105, 'fasting', 36.5, 58.2, 98, 'Keluhan pusing berkurang', 'perawat.dewi'),
    ('sutinem', DATE_SUB(NOW(), INTERVAL 2 DAY), 140, 82, 75, 108, 'fasting', 36.4, 58.0, 97, 'Stabil', 'maya'),
    ('sutinem', DATE_SUB(NOW(), INTERVAL 1 DAY), 135, 80, 72, 112, 'fasting', 36.2, 58.3, 98, 'Kondisi baik', 'budi'),
    ('ahmad', DATE_SUB(NOW(), INTERVAL 6 DAY), 130, 80, 70, 95, 'fasting', 36.5, 72.5, 97, 'Kondisi stabil', 'dr.siti'),
    ('ahmad', DATE_SUB(NOW(), INTERVAL 4 DAY), 135, 82, 72, 98, 'fasting', 36.6, 72.3, 96, 'Asam urat meningkat', 'perawat.anton'),
    ('ahmad', DATE_SUB(NOW(), INTERVAL 2 DAY), 132, 80, 74, 100, 'fasting', 36.7, 72.1, 97, 'Kolesterol terkendali', 'dr.siti')
) AS v(elderly_username, measurement_date, bp_sys, bp_dia, heart_rate, blood_sugar, blood_sugar_type, temperature, weight, oxygen_saturation, notes, recorded_by_username)
JOIN users e ON e.username = v.elderly_username
JOIN users r ON r.username = v.recorded_by_username;

-- Medicines Sample Data
INSERT INTO medicines (elderly_id, medicine_name, dosage, frequency, time_schedule, start_date, end_date, notes, is_active, created_by) 
SELECT e.id, m.medicine_name, m.dosage, m.frequency, m.time_schedule, m.start_date, m.end_date, m.notes, m.is_active, c.id
FROM (VALUES
    ('suwarno', 'Amlodipine', '10mg', '1x sehari', '08:00', DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_ADD(NOW(), INTERVAL 60 DAY), 'Untuk hipertensi', TRUE, 'dr.wijaya'),
    ('suwarno', 'Metformin', '500mg', '2x sehari', '08:00,20:00', DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_ADD(NOW(), INTERVAL 60 DAY), 'Untuk diabetes', TRUE, 'dr.wijaya'),
    ('suwarno', 'Aspirin', '80mg', '1x sehari', '12:00', DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_ADD(NOW(), INTERVAL 60 DAY), 'Pencegahan stroke', TRUE, 'dr.wijaya'),
    ('sutinem', 'Ramipril', '5mg', '1x sehari', '08:00', DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_ADD(NOW(), INTERVAL 60 DAY), 'Untuk hipertensi', TRUE, 'dr.wijaya'),
    ('sutinem', 'Calcium + Vitamin D', '500mg', '2x sehari', '08:00,20:00', DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_ADD(NOW(), INTERVAL 90 DAY), 'Untuk osteoporosis', TRUE, 'dr.wijaya'),
    ('sutinem', 'Alendronate', '70mg', '1x seminggu', '08:00', DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_ADD(NOW(), INTERVAL 180 DAY), 'Untuk osteoporosis, minum hari Senin', TRUE, 'dr.wijaya'),
    ('ahmad', 'Allopurinol', '300mg', '1x sehari', '08:00', DATE_SUB(NOW(), INTERVAL 15 DAY), DATE_ADD(NOW(), INTERVAL 45 DAY), 'Untuk asam urat', TRUE, 'dr.siti'),
    ('ahmad', 'Simvastatin', '20mg', '1x sehari', '20:00', DATE_SUB(NOW(), INTERVAL 15 DAY), DATE_ADD(NOW(), INTERVAL 45 DAY), 'Untuk kolesterol, minum sebelum tidur', TRUE, 'dr.siti')
) AS m(elderly_username, medicine_name, dosage, frequency, time_schedule, start_date, end_date, notes, is_active, created_by_username)
JOIN users e ON e.username = m.elderly_username
JOIN users c ON c.username = m.created_by_username;

-- FAQs
INSERT INTO faqs (question, answer, category, view_order) VALUES
('Bagaimana cara menggunakan aplikasi LansiaMonitoring?', 'Aplikasi LansiaMonitoring dapat diakses melalui web browser. Setelah login, Anda akan melihat dashboard yang disesuaikan dengan peran Anda (keluarga, lansia, atau tenaga medis). Anda dapat mengakses fitur-fitur seperti monitoring kesehatan, jadwal obat, dan komunikasi dengan tenaga medis dari menu navigasi.', 'umum', 1),
('Bagaimana cara mencatat data obat yang sudah dikonsumsi?', 'Untuk mencatat obat yang sudah dikonsumsi: 1) Login ke aplikasi, 2) Buka menu "Obat-obatan", 3) Temukan obat yang ingin dicatat, 4) Klik tombol "Konfirmasi Diminum", 5) Isi form yang muncul dengan waktu konsumsi dan catatan jika ada, 6) Klik "Simpan".', 'obat', 2),
('Apakah data kesehatan saya aman?', 'Ya, keamanan data adalah prioritas kami. Kami menggunakan enkripsi SSL untuk komunikasi data, dan semua informasi kesehatan disimpan dengan enkripsi. Akses ke data dibatasi berdasarkan peran pengguna, dan kami tidak akan membagikan data pribadi Anda kepada pihak ketiga tanpa persetujuan Anda.', 'keamanan', 3),
('Bagaimana cara menambahkan anggota keluarga baru ke akun saya?', 'Untuk menambahkan anggota keluarga: 1) Login sebagai keluarga, 2) Buka menu "Profil", 3) Pilih tab "Keluarga", 4) Klik tombol "Tambah Anggota Keluarga", 5) Isi data yang diminta termasuk hubungan dengan lansia, 6) Klik "Simpan". Administrator akan memverifikasi permintaan Anda dalam 24 jam.', 'akun', 4),
('Bagaimana cara menghubungi tenaga medis melalui aplikasi?', 'Untuk menghubungi tenaga medis: 1) Login ke aplikasi, 2) Buka menu "Konsultasi", 3) Pilih tenaga medis yang ingin dihubungi atau klik "Chat Baru", 4) Tulis pesan Anda dan lampirkan foto jika perlu, 5) Klik "Kirim". Tenaga medis akan merespons secepatnya dalam jam kerja.', 'komunikasi', 5);