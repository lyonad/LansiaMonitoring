 // backend/graphql/schema/lansia.js
const { gql } = require('apollo-server-express');

const lansiaTypeDefs = gql`
  # Type Lansia
  type Lansia {
    id_lansia: ID!
    id_pengguna: ID
    nama: String!
    usia: Int!
    kondisi: String
    alamat: String
    tanggal_lahir: String
    golongan_darah: String
    created_at: String!
    updated_at: String!
    
    # Relasi
    pengguna: Pengguna
    keluarga: [Keluarga!]!
    jadwalObat: [JadwalKonsumsiObat!]!
    pemantauanKesehatan: [PemantauanKesehatan!]!
    pengingatPerawatan: [PengingatPerawatan!]!
    konsultasi: [Konsultasi!]!
    laporanKesehatan: [LaporanKesehatan!]!
    kontakDarurat: [KontakDarurat!]!
    
    # Computed fields
    pemantauanTerakhir: PemantauanKesehatan
    jadwalObatHariIni: [JadwalKonsumsiObat!]!
    konsultasiMendatang: [Konsultasi!]!
  }
  
  # Input untuk create/update Lansia
  input LansiaInput {
    nama: String!
    usia: Int!
    kondisi: String
    alamat: String
    tanggal_lahir: String
    golongan_darah: String
    id_keluarga: ID # ID keluarga yang mendaftarkan
  }
  
  input UpdateLansiaInput {
    nama: String
    usia: Int
    kondisi: String
    alamat: String
    tanggal_lahir: String
    golongan_darah: String
  }
  
  # Filter untuk query
  input LansiaFilter {
    nama: String
    usiaMin: Int
    usiaMax: Int
    kondisi: String
    golongan_darah: String
  }
  
  # Queries
  extend type Query {
    # Get lansia by ID
    lansia(id: ID!): Lansia
    
    # Get all lansia dengan filter
    allLansia(
      filter: LansiaFilter
      limit: Int
      offset: Int
    ): [Lansia!]!
    
    # Get lansia untuk keluarga tertentu
    lansiaByKeluarga(idKeluarga: ID!): [Lansia!]!
    
    # Search lansia
    searchLansia(keyword: String!): [Lansia!]!
    
    # Statistik lansia
    statistikLansia: StatistikLansia!
  }
  
  # Type untuk statistik
  type StatistikLansia {
    total: Int!
    berdasarkanUsia: [StatistikUsia!]!
    berdasarkanKondisi: [StatistikKondisi!]!
    berdasarkanGolDarah: [StatistikGolDarah!]!
  }
  
  type StatistikUsia {
    range: String!
    jumlah: Int!
  }
  
  type StatistikKondisi {
    kondisi: String!
    jumlah: Int!
  }
  
  type StatistikGolDarah {
    golongan: String!
    jumlah: Int!
  }
  
  # Mutations
  extend type Mutation {
    # Create lansia (untuk registrasi mandiri atau oleh keluarga)
    createLansia(input: LansiaInput!): Lansia!
    
    # Update lansia
    updateLansia(id: ID!, input: UpdateLansiaInput!): Lansia!
    
    # Delete lansia (soft delete)
    deleteLansia(id: ID!): Boolean!
    
    # Assign lansia ke keluarga
    assignLansiaToKeluarga(idLansia: ID!, idKeluarga: ID!): Lansia!
    
    # Remove lansia dari keluarga
    removeLansiaFromKeluarga(idLansia: ID!, idKeluarga: ID!): Boolean!
  }
`;

module.exports = lansiaTypeDefs;
