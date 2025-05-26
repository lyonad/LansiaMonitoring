 # LansiaMonitoring - Aplikasi Monitoring Kesehatan Lansia

Aplikasi web untuk monitoring kesehatan lansia dengan fitur pencatatan jadwal obat, pemantauan vital signs, konsultasi online, dan forum diskusi.

## 🚀 Cara Setup dan Menjalankan

### Prerequisites
- XAMPP (dengan MySQL & Apache)
- Node.js (v14 atau lebih baru)
- NPM atau Yarn

### Step 1: Setup Database

1. **Start XAMPP**
   - Jalankan XAMPP Control Panel
   - Start Apache dan MySQL

2. **Buat Database**
   - Buka phpMyAdmin (http://localhost/phpmyadmin)
   - Jalankan file `database/schema.sql` untuk membuat struktur database
   - Jalankan file `database/seed.sql` untuk data testing

### Step 2: Setup Backend

1. **Navigate ke folder backend**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment**
   - Copy `.env.example` ke `.env`
   - Sesuaikan konfigurasi database jika perlu

4. **Jalankan server**
   ```bash
   npm run dev
   ```
   
   Server akan berjalan di http://localhost:4000
   GraphQL Playground di http://localhost:4000/graphql

### Step 3: Testing GraphQL

Buka GraphQL Playground dan coba query berikut:

#### 1. Register User Baru
```graphql
mutation {
  register(input: {
    nama: "Test User"
    email: "test@email.com"
    password: "password123"
    peran: keluarga
    dataKeluarga: {
      nama: "Test Keluarga"
      hubungan_dengan_lansia: "Anak"
      nomor_telepon: "081234567890"
    }
  }) {
    token
    user {
      id_pengguna
      nama
      email
      peran
    }
  }
}
```

#### 2. Login
```graphql
mutation {
  login(email: "test@email.com", password: "password123") {
    token
    user {
      id_pengguna
      nama
      email
      peran
    }
  }
}
```

#### 3. Get Current User (dengan token)
Set header Authorization: Bearer YOUR_TOKEN
```graphql
query {
  me {
    id_pengguna
    nama
    email
    peran
  }
}
```

#### 4. Get All Lansia
```graphql
query {
  allLansia {
    id_lansia
    nama
    usia
    kondisi
    pemantauanTerakhir {
      tekanan_darah_sistolik
      tekanan_darah_diastolik
      gula_darah
    }
  }
}
```

### Step 4: Password Default untuk Testing

Semua user di seed data menggunakan password: `password123`

Email yang bisa digunakan:
- `siti.rahma@email.com` (Lansia)
- `budi.santoso@email.com` (Lansia)
- `ahmad.kel@email.com` (Keluarga)
- `dr.andi@email.com` (Tenaga Medis)
- `admin@email.com` (Admin)

## 📁 Struktur File yang Perlu Dibuat

### Backend Files yang Masih Perlu Dibuat:

1. **GraphQL Schema** (di folder `backend/graphql/schema/`):
   - `keluarga.js`
   - `tenagaMedis.js`
   - `pengingat.js`
   - `konsultasi.js`
   - `laporan.js`
   - `kontakDarurat.js`
   - `forum.js`

2. **GraphQL Resolvers** (di folder `backend/graphql/resolvers/`):
   - `keluarga.js`
   - `tenagaMedis.js`
   - `jadwalObat.js`
   - `pemantauan.js`
   - `pengingat.js`
   - `konsultasi.js`
   - `laporan.js`
   - `kontakDarurat.js`
   - `forum.js`
   - `index.js` (untuk menggabungkan semua resolvers)

3. **Utils** (di folder `backend/utils/`):
   - `validators.js`
   - `helpers.js`

4. **Middleware** (di folder `backend/middleware/`):
   - `auth.js`

## 🛠️ Troubleshooting

### Error: Cannot connect to database
- Pastikan MySQL di XAMPP sudah running
- Check username/password di file `.env`
- Pastikan database `lansia_monitoring` sudah dibuat

### Error: Port 4000 already in use
- Ganti port di file `.env`
- Atau stop aplikasi lain yang menggunakan port 4000

### Error: bcrypt not working
- Hapus `node_modules` dan install ulang
- Pastikan menggunakan Node.js versi yang compatible

## 📝 Next Steps

Setelah backend berjalan dengan baik:
1. Implementasi semua GraphQL schema dan resolvers yang belum dibuat
2. Setup frontend dengan React dan Apollo Client
3. Implementasi authentication di frontend
4. Buat komponen-komponen UI
5. Implementasi real-time features dengan GraphQL Subscriptions

## 🔐 Security Notes

Untuk production:
- Ganti JWT_SECRET dengan string yang aman
- Gunakan HTTPS
- Implementasi rate limiting
- Sanitasi semua input
- Setup proper CORS policy
