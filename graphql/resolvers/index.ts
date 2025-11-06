import { userResolvers } from "./userResolver";
import { journalResolvers } from "./journalResolver";
import { moodResolvers } from "./moodResolver";
import { recommendationResolvers } from "./recommendationResolver";

export const resolvers = {
  Query: {
    ...userResolvers.Query,
    ...journalResolvers.Query,
    ...moodResolvers.Query,
    ...recommendationResolvers.Query,
  },
  Mutation: {
    ...userResolvers.Mutation,
    ...journalResolvers.Mutation,
    ...moodResolvers.Mutation,
    ...recommendationResolvers.Mutation,
  },
};
