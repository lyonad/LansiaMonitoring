// backend/graphql/schema/jadwalObat.js
const { gql } = require('apollo-server-express');

const jadwalObatTypeDefs = gql`
  # Enum untuk status jadwal obat
  enum StatusJadwalObat {
    aktif
    selesai
    dibatalkan
  }
  
  # Type untuk Jadwal Konsumsi Obat
  type JadwalKonsumsiObat {
    id_jadwal_konsumsi_obat: ID!
    id_lansia: ID!
    obat: String!
    dosis: String!
    waktu: String!
    frekuensi: String
    tanggal_mulai: String
    tanggal_selesai: String
    catatan: String
    status: StatusJadwalObat!
    created_at: String!
    updated_at: String!
    
    # Relasi
    lansia: Lansia!
  }
  
  # Input untuk create jadwal obat
  input JadwalObatInput {
    id_lansia: ID!
    obat: String!
    dosis: String!
    waktu: String!
    frekuensi: String
    tanggal_mulai: String
    tanggal_selesai: String
    catatan: String
  }
  
  # Input untuk update jadwal obat
  input UpdateJadwalObatInput {
    obat: String
    dosis: String
    waktu: String
    frekuensi: String
    tanggal_mulai: String
    tanggal_selesai: String
    catatan: String
    status: StatusJadwalObat
  }
  
  # Extend Query type
  extend type Query {
    # Get jadwal obat by ID
    jadwalObat(id: ID!): JadwalKonsumsiObat
    
    # Get all jadwal obat untuk lansia tertentu
    jadwalObatByLansia(
      idLansia: ID!
      status: StatusJadwalObat
    ): [JadwalKonsumsiObat!]!
    
    # Get jadwal obat hari ini
    jadwalObatHariIni(idLansia: ID): [JadwalKonsumsiObat!]!
    
    # Get all jadwal obat (untuk admin/dokter)
    allJadwalObat(
      limit: Int
      offset: Int
    ): [JadwalKonsumsiObat!]!
  }
  
  # Extend Mutation type
  extend type Mutation {
    # Create jadwal obat baru
    createJadwalObat(input: JadwalObatInput!): JadwalKonsumsiObat!
    
    # Update jadwal obat
    updateJadwalObat(id: ID!, input: UpdateJadwalObatInput!): JadwalKonsumsiObat!
    
    # Delete jadwal obat
    deleteJadwalObat(id: ID!): Boolean!
    
    # Update status jadwal obat
    updateStatusJadwalObat(id: ID!, status: StatusJadwalObat!): JadwalKonsumsiObat!
  }
`;

module.exports = jadwalObatTypeDefs;