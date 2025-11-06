import gql from "graphql-tag";

export const recommendationTypeDefs = gql`
  type Recommendation {
    id: ID!
    userId: String!
    moodRecordId: String
    type: String!
    content: JSON!
    createdAt: String!
    user: User!
    moodRecord: MoodRecord
  }

  extend type Query {
    getRecommendations(userId: String!): [Recommendation!]
  }
`;