import gql from "graphql-tag";

export const userTypeDefs = gql`
  type User {
    id: ID!
    name: String
    email: String
    image: String
    journals: [Journal!]
    moodRecords: [MoodRecord!]
    recommendations: [Recommendation!]
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    me: User
    users: [User!]
  }

  type Mutation {
    registerUser(name: String!, email: String!, password: String!): User
  }
`;