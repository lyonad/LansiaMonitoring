// backend/graphql/resolvers/index.js

// Temporary resolvers untuk testing
module.exports = {
  Query: {
    hello: () => 'Hello from LansiaMonitoring GraphQL Server!'
  },
  Mutation: {
    login: async (_, { email, password }) => {
      // Temporary implementation untuk testing
      return {
        token: 'temporary-token-for-testing',
        user: {
          id_pengguna: 'USR001',
          nama: 'Test User',
          email: email,
          peran: 'admin'
        }
      };
    }
  }
};