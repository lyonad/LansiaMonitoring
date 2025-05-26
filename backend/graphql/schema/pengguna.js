 // backend/graphql/schema/pengguna.js
const { gql } = require('apollo-server-express');

const penggunaTypeDefs = gql`
  # Enum untuk peran pengguna
  enum UserRole {
    lansia
    keluarga
    tenaga_medis
    admin
  }
  
  # Type Pengguna - Base user untuk semua role
  type Pengguna {
    id_pengguna: ID!
    nama: String!
    email: String!
    peran: UserRole!
    created_at: String!
    updated_at: String!
    
    # Relasi berdasarkan peran
    lansia: Lansia
    keluarga: Keluarga
    tenagaMedis: TenagaMedis
  }
  
  # Input untuk registrasi
  input RegisterInput {
    nama: String!
    email: String!
    password: String!
    peran: UserRole!
    
    # Data tambahan berdasarkan peran
    dataLansia: LansiaInput
    dataKeluarga: KeluargaInput
    dataTenagaMedis: TenagaMedisInput
  }
  
  # Input untuk update profile
  input UpdateProfileInput {
    nama: String
    email: String
    password: String
  }
  
  # Type untuk authentication response
  type AuthPayload {
    token: String!
    user: Pengguna!
  }
  
  # Queries
  extend type Query {
    # Get current user dari token
    me: Pengguna
    
    # Get user by ID (admin only)
    pengguna(id: ID!): Pengguna
    
    # Get all users dengan filter (admin only)
    allPengguna(
      peran: UserRole
      limit: Int
      offset: Int
    ): [Pengguna!]!
    
    # Count users
    countPengguna(peran: UserRole): Int!
  }
  
  # Mutations
  extend type Mutation {
    # Register user baru
    register(input: RegisterInput!): AuthPayload!
    
    # Login
    login(email: String!, password: String!): AuthPayload!
    
    # Update profile
    updateProfile(input: UpdateProfileInput!): Pengguna!
    
    # Change password
    changePassword(oldPassword: String!, newPassword: String!): Boolean!
    
    # Delete account
    deleteAccount(password: String!): Boolean!
    
    # Admin: Update user role
    updateUserRole(userId: ID!, newRole: UserRole!): Pengguna!
    
    # Admin: Delete user
    deleteUser(userId: ID!): Boolean!
  }
`;

module.exports = penggunaTypeDefs;
