// generate-hash.js - Script untuk generate bcrypt hash
const bcrypt = require('bcryptjs');

// Password yang akan di-hash
const password = 'password123';

// Generate hash
async function generateHash() {
    try {
        // Generate salt
        const salt = await bcrypt.genSalt(10);
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, salt);
        
        console.log('=====================================');
        console.log('Password:', password);
        console.log('Hashed:', hashedPassword);
        console.log('=====================================');
        
        // Generate SQL untuk test accounts
        console.log('\n-- SQL untuk insert test accounts:');
        console.log(`
-- Admin account (password: password123)
INSERT INTO users (username, password, email, full_name, role, created_at) 
VALUES ('admin', '${hashedPassword}', 'admin@test.com', 'Administrator', 'admin', NOW());

-- Family account (password: password123)
INSERT INTO users (username, password, email, full_name, role, created_at) 
VALUES ('keluarga1', '${hashedPassword}', 'keluarga@test.com', 'Budi Santoso', 'family', NOW());

-- Elderly account (password: password123)
INSERT INTO users (username, password, email, full_name, role, date_of_birth, created_at) 
VALUES ('lansia1', '${hashedPassword}', 'lansia@test.com', 'Kakek Suryadi', 'elderly', '1950-05-15', NOW());

-- Medical staff account (password: password123)
INSERT INTO users (username, password, email, full_name, role, created_at) 
VALUES ('dokter1', '${hashedPassword}', 'dokter@test.com', 'Dr. Siti Nurhaliza', 'medical', NOW());

-- Link family to elderly (optional)
INSERT INTO family_elderly_relations (family_user_id, elderly_user_id, relationship)
SELECT 
    (SELECT id FROM users WHERE username = 'keluarga1'),
    (SELECT id FROM users WHERE username = 'lansia1'),
    'Anak';

-- Add emergency contacts for elderly
INSERT INTO emergency_contacts (user_id, contact_name, contact_phone, relationship, priority)
SELECT 
    (SELECT id FROM users WHERE username = 'lansia1'),
    'Budi Santoso',
    '081234567890',
    'Anak',
    1;

INSERT INTO emergency_contacts (user_id, contact_name, contact_phone, relationship, priority)
SELECT 
    (SELECT id FROM users WHERE username = 'lansia1'),
    'RS Harapan Kita',
    '021-5684093',
    'Rumah Sakit',
    2;
        `);
        
        // Test verification
        console.log('\n-- Testing hash verification:');
        const isValid = await bcrypt.compare(password, hashedPassword);
        console.log('Password verification:', isValid ? 'SUCCESS ✓' : 'FAILED ✗');
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// Run the function
generateHash();
