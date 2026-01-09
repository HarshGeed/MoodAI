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

  type YouTubeVideo {
    videoId: String!
    title: String!
    description: String!
    thumbnail: String!
    channelTitle: String!
    publishedAt: String!
  }

  type TMDBMovie {
    id: Int!
    title: String!
    overview: String!
    posterPath: String
    releaseDate: String!
    voteAverage: Float!
    genreIds: [Int!]!
  }

  type MoodBasedRecommendations {
    moodLabel: String!
    moodCategory: String
    moodScore: Float
    youtubeVideos: [YouTubeVideo!]!
    youtubeSongs: [YouTubeVideo!]!
    movies: [TMDBMovie!]!
  }

  extend type Query {
    getRecommendations(userId: String!): [Recommendation!]
    getMoodBasedRecommendations(userId: String!): MoodBasedRecommendations
  }

  extend type Mutation {
    generateRecommendation(moodRecordId: String!): Recommendation
    generateMoodBasedRecommendations(userId: String!): MoodBasedRecommendations
  }
`;