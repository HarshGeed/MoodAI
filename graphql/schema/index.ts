import { userTypeDefs } from "./userSchema";
import { journalTypeDefs } from "./journalSchema";
import { moodTypeDefs } from "./moodSchema";
import { recommendationTypeDefs } from "./recommendationSchema";
import gql from "graphql-tag";

export const typeDefs = gql`
    scalar JSON
    ${userTypeDefs}
    ${journalTypeDefs}
    ${moodTypeDefs}
    ${recommendationTypeDefs}
`;