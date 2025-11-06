import gql from "graphql-tag";

export const journalTypeDefs = gql`
  type Journal {
    id: ID!
    userId: String!
    content: String!
    mood: String
    vectorId: String
    createdAt: String!
    user: User!
    moodRecord: MoodRecord
  }

  extend type Query {
    getJournalsByUser(userId: String!): [Journal!]
  }

  extend type Mutation {
    createJournal(userId: String!, content: String!): Journal
  }
`;