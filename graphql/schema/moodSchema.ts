import gql from "graphql-tag";

export const moodTypeDefs = gql`
  type MoodRecord {
    id: ID!
    userId: String!
    journalId: String
    moodLabel: String!
    moodScore: Float
    moodCategory: String
    createdAt: String!
    user: User!
    journal: Journal
    recommendations: [Recommendation!]
  }

  extend type Query {
    getMoodHistory(userId: String!): [MoodRecord!]
  }

  extend type Mutation {
    analyzeMood(journalId: String!): MoodRecord
  }
`;