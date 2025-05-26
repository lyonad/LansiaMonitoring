// backend/server.js
const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const { mergeTypeDefs, mergeResolvers } = require('@graphql-tools/merge');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

// Import schemas
const jadwalObatTypeDefs = require('./graphql/schema/jadwalObat');
const pemantauanTypeDefs = require('./graphql/schema/pemantauan');

// Import resolvers
const jadwalObatResolvers = require('./graphql/resolvers/jadwalObat');
const pemantauanResolvers = require('./graphql/resolvers/pemantauan');

// JWT Secret (nanti pindah ke .env)
const JWT_SECRET = 'your-secret-key-change-this-in-production';

// Create database connection pool
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '', // Default XAMPP password kosong
  database: 'lansia_monitoring',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
async function testConnection() {
  try {
    const connection = await db.getConnection();
    console.log('✅ Database connected!');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

testConnection();

// Base GraphQL Schema
const baseTypeDefs = gql`
  type Query {
    hello: String
    me: Pengguna
    allLansia: [Lansia!]!
  }
  
  type Mutation {
    login(email: String!, password: String!): AuthPayload!
    register(
      nama: String!
      email: String!
      password: String!
      peran: String!
    ): AuthPayload!
  }
  
  type Pengguna {
    id_pengguna: ID!
    nama: String!
    email: String!
    peran: String!
    created_at: String
    updated_at: String
  }
  
  type Lansia {
    id_lansia: ID!
    nama: String!
    usia: Int!
    kondisi: String
    alamat: String
    golongan_darah: String
  }
  
  type AuthPayload {
    token: String!
    user: Pengguna!
  }
`;

// Merge all type definitions
const typeDefs = mergeTypeDefs([baseTypeDefs, jadwalObatTypeDefs, pemantauanTypeDefs]);

// Base GraphQL Resolvers
const baseResolvers = {
  Query: {
    hello: () => 'Hello from LansiaMonitoring!',
    
    me: async (_, __, { user }) => {
      if (!user) return null;
      return user;
    },
    
    allLansia: async () => {
      try {
        const [rows] = await db.execute('SELECT * FROM lansia');
        return rows;
      } catch (error) {
        console.error('Error fetching lansia:', error);
        return [];
      }
    }
  },
  
  Mutation: {
    login: async (_, { email, password }) => {
      try {
        // Get user by email
        const [users] = await db.execute(
          'SELECT * FROM pengguna WHERE email = ?',
          [email]
        );
        
        if (users.length === 0) {
          throw new Error('Email atau password salah');
        }
        
        const user = users[0];
        
        // For testing: password123
        // In real app, use: const valid = await bcrypt.compare(password, user.password);
        const valid = password === 'password123';
        
        if (!valid) {
          throw new Error('Email atau password salah');
        }
        
        // Generate token
        const token = jwt.sign(
          { userId: user.id_pengguna, email: user.email, peran: user.peran },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
        
        return {
          token,
          user
        };
      } catch (error) {
        throw new Error(error.message);
      }
    },
    
    register: async (_, { nama, email, password, peran }) => {
      try {
        // Check if email exists
        const [existing] = await db.execute(
          'SELECT id_pengguna FROM pengguna WHERE email = ?',
          [email]
        );
        
        if (existing.length > 0) {
          throw new Error('Email sudah terdaftar');
        }
        
        // Hash password (for now, just use plain text for testing)
        const hashedPassword = password; // In real app: await bcrypt.hash(password, 10);
        
        // Generate user ID
        const userId = 'USR' + Date.now();
        
        // Insert user
        await db.execute(
          'INSERT INTO pengguna (id_pengguna, nama, email, password, peran) VALUES (?, ?, ?, ?, ?)',
          [userId, nama, email, hashedPassword, peran]
        );
        
        // Generate token
        const token = jwt.sign(
          { userId, email, peran },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
        
        return {
          token,
          user: {
            id_pengguna: userId,
            nama,
            email,
            peran,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        };
      } catch (error) {
        throw new Error(error.message);
      }
    }
  }
};

// Merge all resolvers
const resolvers = mergeResolvers([baseResolvers, jadwalObatResolvers, pemantauanResolvers]);

// Helper to get user from token
const getUser = async (token) => {
  try {
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const [rows] = await db.execute(
        'SELECT * FROM pengguna WHERE id_pengguna = ?',
        [decoded.userId]
      );
      return rows[0];
    }
    return null;
  } catch (error) {
    return null;
  }
};

async function startServer() {
  const app = express();
  
  app.use(cors());
  app.use(express.json());
  
  // Welcome page di root URL
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>LansiaMonitoring API</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .container {
              background: white;
              border-radius: 20px;
              box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
              padding: 40px;
              max-width: 600px;
              width: 90%;
            }
            h1 {
              color: #333;
              font-size: 2.5em;
              margin-bottom: 10px;
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .subtitle {
              color: #666;
              font-size: 1.1em;
              margin-bottom: 30px;
            }
            .feature-badge {
              display: inline-block;
              background: #48bb78;
              color: white;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 0.8em;
              margin-left: 10px;
            }
            .section {
              margin-bottom: 30px;
            }
            h2 {
              color: #444;
              font-size: 1.4em;
              margin-bottom: 15px;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .links {
              display: flex;
              gap: 15px;
              flex-wrap: wrap;
              margin-bottom: 30px;
            }
            .link {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              padding: 12px 24px;
              background: #667eea;
              color: white;
              text-decoration: none;
              border-radius: 10px;
              font-weight: 500;
              transition: all 0.3s ease;
              box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
            }
            .link:hover {
              background: #5a67d8;
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
            }
            .accounts {
              background: #f7fafc;
              border-radius: 10px;
              padding: 20px;
            }
            .account-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 15px;
              margin-top: 15px;
            }
            .account-card {
              background: white;
              padding: 15px;
              border-radius: 8px;
              border: 1px solid #e2e8f0;
            }
            .account-role {
              font-size: 0.9em;
              color: #667eea;
              font-weight: 600;
              margin-bottom: 5px;
            }
            .account-email {
              font-size: 0.95em;
              color: #4a5568;
              font-family: monospace;
            }
            .password-note {
              margin-top: 15px;
              padding: 10px 15px;
              background: #fef5e7;
              border-left: 4px solid #f39c12;
              border-radius: 4px;
              font-size: 0.95em;
              color: #7a6a00;
            }
            .api-docs {
              background: #f0f4f8;
              padding: 20px;
              border-radius: 10px;
              margin-top: 20px;
            }
            .code {
              background: #2d3748;
              color: #68d391;
              padding: 2px 6px;
              border-radius: 4px;
              font-family: 'Courier New', monospace;
              font-size: 0.9em;
            }
            .status {
              display: inline-flex;
              align-items: center;
              gap: 5px;
              padding: 5px 12px;
              background: #c6f6d5;
              color: #276749;
              border-radius: 20px;
              font-size: 0.85em;
              font-weight: 600;
              margin-left: auto;
            }
            .status-dot {
              width: 8px;
              height: 8px;
              background: #48bb78;
              border-radius: 50%;
              animation: pulse 2s infinite;
            }
            @keyframes pulse {
              0% { opacity: 1; }
              50% { opacity: 0.5; }
              100% { opacity: 1; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>
              🏥 LansiaMonitoring API
              <span class="feature-badge">✨ Pemantauan Added!</span>
              <span class="status">
                <span class="status-dot"></span>
                Running
              </span>
            </h1>
            <p class="subtitle">Backend GraphQL API untuk Aplikasi Monitoring Kesehatan Lansia</p>
            
            <div class="links">
              <a href="/graphql" class="link">
                📊 GraphQL Playground
              </a>
              <a href="/health" class="link">
                ❤️ Health Check
              </a>
            </div>
            
            <div class="section">
              <h2>🔐 Test Accounts</h2>
              <div class="accounts">
                <div class="account-grid">
                  <div class="account-card">
                    <div class="account-role">👨‍💼 Admin</div>
                    <div class="account-email">admin@email.com</div>
                  </div>
                  <div class="account-card">
                    <div class="account-role">👨‍⚕️ Dokter</div>
                    <div class="account-email">dr.andi@email.com</div>
                  </div>
                  <div class="account-card">
                    <div class="account-role">👨‍👩‍👧 Keluarga</div>
                    <div class="account-email">ahmad.kel@email.com</div>
                  </div>
                  <div class="account-card">
                    <div class="account-role">👵 Lansia</div>
                    <div class="account-email">siti.rahma@email.com</div>
                  </div>
                </div>
                <div class="password-note">
                  🔑 Password untuk semua akun: <span class="code">password123</span>
                </div>
              </div>
            </div>
            
            <div class="section">
              <h2>📚 Quick Start</h2>
              <div class="api-docs">
                <p style="margin-bottom: 10px;">1. Buka <a href="/graphql" style="color: #667eea;">GraphQL Playground</a></p>
                <p style="margin-bottom: 10px;">2. Login dengan salah satu test account</p>
                <p style="margin-bottom: 10px;">3. Copy token dari response</p>
                <p>4. Set header: <span class="code">Authorization: Bearer YOUR_TOKEN</span></p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 30px; color: #718096; font-size: 0.9em;">
              Made with ❤️ for Lansia Care | Port: ${PORT}
            </div>
          </div>
        </body>
      </html>
    `);
  });
  
  // Health check
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'OK', 
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });
  
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: async ({ req }) => {
      // Get user from token
      const token = req.headers.authorization || '';
      const user = await getUser(token.replace('Bearer ', ''));
      
      return { db, user };
    }
  });
  
  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });
  
  const PORT = process.env.PORT || 4000;
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📊 GraphQL at http://localhost:${PORT}${server.graphqlPath}`);
    console.log(`✨ New Features: Jadwal Obat & Pemantauan Kesehatan API ready!`);
  });
}

startServer().catch(err => {
  console.error('Error starting server:', err);
});