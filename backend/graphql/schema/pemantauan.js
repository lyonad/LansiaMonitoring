// backend/graphql/schema/pemantauan.js
const { gql } = require('apollo-server-express');

const pemantauanTypeDefs = gql`
  # Type untuk Pemantauan Kesehatan
  type PemantauanKesehatan {
    id_pemantauan_kesehatan: ID!
    id_lansia: ID!
    tekanan_darah_sistolik: Int
    tekanan_darah_diastolik: Int
    gula_darah: Float
    detak_jantung: Int
    suhu_tubuh: Float
    berat_badan: Float
    tinggi_badan: Float
    catatan: String
    tanggal_pemeriksaan: String!
    created_at: String!
    updated_at: String!
    
    # Relasi
    lansia: Lansia!
    
    # Computed fields
    tekananDarahLengkap: String
    statusTekananDarah: String
    statusGulaDarah: String
    bmi: Float
    statusBmi: String
  }
  
  # Input untuk create pemantauan
  input PemantauanInput {
    id_lansia: ID!
    tekanan_darah_sistolik: Int
    tekanan_darah_diastolik: Int
    gula_darah: Float
    detak_jantung: Int
    suhu_tubuh: Float
    berat_badan: Float
    tinggi_badan: Float
    catatan: String
    tanggal_pemeriksaan: String
  }
  
  # Input untuk update pemantauan
  input UpdatePemantauanInput {
    tekanan_darah_sistolik: Int
    tekanan_darah_diastolik: Int
    gula_darah: Float
    detak_jantung: Int
    suhu_tubuh: Float
    berat_badan: Float
    tinggi_badan: Float
    catatan: String
  }
  
  # Type untuk statistik kesehatan
  type StatistikKesehatan {
    rataRataTekananSistolik: Float
    rataRataTekananDiastolik: Float
    rataRataGulaDarah: Float
    rataRataDetakJantung: Float
    trenTekananDarah: String
    trenGulaDarah: String
  }
  
  # Type untuk ringkasan kesehatan
  type RingkasanKesehatan {
    pemantauanTerakhir: PemantauanKesehatan
    totalPemantauan: Int
    statusKesehatanUmum: String
    alertKesehatan: [String!]
  }
  
  # Extend Query
  extend type Query {
    # Get pemantauan by ID
    pemantauanKesehatan(id: ID!): PemantauanKesehatan
    
    # Get all pemantauan untuk lansia
    pemantauanByLansia(
      idLansia: ID!
      limit: Int
      offset: Int
    ): [PemantauanKesehatan!]!
    
    # Get pemantauan terakhir
    pemantauanTerakhir(idLansia: ID!): PemantauanKesehatan
    
    # Get pemantauan dalam range tanggal
    pemantauanByDateRange(
      idLansia: ID!
      startDate: String!
      endDate: String!
    ): [PemantauanKesehatan!]!
    
    # Get statistik kesehatan
    statistikKesehatan(
      idLansia: ID!
      periode: Int # dalam hari
    ): StatistikKesehatan!
    
    # Get ringkasan kesehatan
    ringkasanKesehatan(idLansia: ID!): RingkasanKesehatan!
  }
  
  # Extend Mutation
  extend type Mutation {
    # Create pemantauan baru
    createPemantauan(input: PemantauanInput!): PemantauanKesehatan!
    
    # Update pemantauan
    updatePemantauan(id: ID!, input: UpdatePemantauanInput!): PemantauanKesehatan!
    
    # Delete pemantauan
    deletePemantauan(id: ID!): Boolean!
    
    # Quick input vital signs
    quickInputVitalSigns(
      idLansia: ID!
      tekananSistolik: Int!
      tekananDiastolik: Int!
      gulaDarah: Float!
    ): PemantauanKesehatan!
  }
`;

module.exports = pemantauanTypeDefs;