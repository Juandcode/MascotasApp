export const typeDefs = `#graphql
  type Pet {
    id: ID!
    name: String!
    species: String!
    age: Int
    createdAt: String!
  }

  input CreatePetInput {
    name: String!
    species: String!
    age: Int
  }

  type Query {
    pets: [Pet!]!
    pet(id: ID!): Pet
  }

  type Mutation {
    createPet(input: CreatePetInput!): Pet!
  }
`;
