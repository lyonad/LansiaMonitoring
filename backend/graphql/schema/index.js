// backend/graphql/schema/index.js
const { gql } = require('apollo-server-express');

// Definisi schema GraphQL
const typeDefs = gql`
  type Query {
    hello: String
    me: Pengguna
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
  
  type AuthPayload {
    token: String!
    user: Pengguna!
  }
`;

module.exports = typeDefs;