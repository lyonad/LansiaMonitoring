# LansiaMonitoring - Setup Instructions

## 📋 Prerequisites

1. **XAMPP** installed with:
   - Apache
   - MySQL
   - PHP (for phpMyAdmin)

2. **Node.js** (v14 or higher) installed

## 🚀 Installation Steps

### 1. Clone/Copy Project Structure

```
C:\xampp\htdocs\LansiaMonitoring\
├── backend/
├── frontend/
└── database/
```

### 2. Database Setup

1. Start XAMPP Control Panel
2. Start **Apache** and **MySQL**
3. Open phpMyAdmin: http://localhost/phpmyadmin
4. Create new database named `lansia_monitoring`
5. Import the database schema:
   - Click on `lansia_monitoring` database
   - Go to "Import" tab
   - Choose file: `database/lansia_monitoring.sql`
   - Click "Go"

### 3. Backend Setup

1. Open terminal/command prompt
2. Navigate to backend folder:
   ```bash
   cd C:\xampp\htdocs\LansiaMonitoring\backend
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create `.env` file:
   - Copy `.env.example` to `.env`
   - Update with your settings:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=lansia_monitoring
   JWT_SECRET=your_secret_key_here_change_this
   PORT=3000
   ```

5. Create required folders:
   ```bash
   mkdir uploads
   ```

6. Start the server:
   ```bash
   npm run dev
   ```

   You should see:
   ```
   Server berjalan pada port 3000
   http://localhost:3000
   ```

### 4. Frontend Access

1. Make sure Apache is running in XAMPP
2. Open browser and go to:
   ```
   http://localhost/LansiaMonitoring/frontend/login.html
   ```

### 5. Test Accounts

Create test accounts via registration or use these SQL commands:

```sql
-- Admin account
INSERT INTO users (username, password, email, full_name, role) 
VALUES ('admin', '$2b$10$YourHashedPassword', 'admin@test.com', 'Administrator', 'admin');

-- Family account
INSERT INTO users (username, password, email, full_name, role) 
VALUES ('keluarga1', '$2b$10$YourHashedPassword', 'keluarga@test.com', 'Keluarga Test', 'family');

-- Elderly account
INSERT INTO users (username, password, email, full_name, role) 
VALUES ('lansia1', '$2b$10$YourHashedPassword', 'lansia@test.com', 'Lansia Test', 'elderly');

-- Medical staff account
INSERT INTO users (username, password, email, full_name, role) 
VALUES ('dokter1', '$2b$10$YourHashedPassword', 'dokter@test.com', 'Dr. Test', 'medical');
```

**Note**: Default password for test accounts is `password123` (hash it first using bcrypt)

## 🔧 Troubleshooting

### Backend won't start

1. **Error: Cannot find module**
   - Make sure you ran `npm install`
   - Check if all files are in correct folders

2. **Database connection error**
   - Check if MySQL is running in XAMPP
   - Verify `.env` database credentials
   - Make sure database `lansia_monitoring` exists

3. **Port already in use**
   - Change PORT in `.env` file
   - Or stop other process using port 3000

### Frontend issues

1. **404 Not Found**
   - Check if Apache is running
   - Verify project is in `C:\xampp\htdocs\LansiaMonitoring`
   - Use correct URL path

2. **API connection failed**
   - Make sure backend is running (npm run dev)
   - Check browser console for errors
   - Verify API_BASE_URL in auth.js

## 📁 Project Structure

```
LansiaMonitoring/
├── backend/
│   ├── config/         # Database configuration
│   ├── controllers/    # Business logic
│   ├── middleware/     # Auth & validation
│   ├── routes/         # API endpoints
│   ├── uploads/        # File uploads
│   ├── .env           # Environment variables
│   ├── app.js         # Main server file
│   └── package.json   # Dependencies
├── frontend/
│   ├── css/           # Stylesheets
│   ├── js/            # JavaScript files
│   ├── pages/         # HTML pages
│   ├── images/        # Images/assets
│   ├── index.html     # Landing page
│   └── login.html     # Login page
└── database/
    └── lansia_monitoring.sql  # Database schema
```

## 🌟 Features Available

- ✅ Multi-role authentication (Admin, Family, Medical, Elderly)
- ✅ Responsive dashboard
- ✅ Accessibility features (font size, high contrast)
- ✅ JWT-based API security
- ✅ Activity logging

## 🚧 Features To Be Implemented

- Medicine management & reminders
- Health monitoring (blood pressure, sugar levels)
- Appointment scheduling
- Chat consultation
- Report generation
- Forum discussions
- Email/SMS notifications

## 📞 Support

If you encounter any issues:
1. Check error messages in browser console (F12)
2. Check backend terminal for server errors
3. Verify all prerequisites are installed
4. Ensure correct file permissions