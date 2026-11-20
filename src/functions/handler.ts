import { ApolloServer } from "@apollo/server";
import { startServerAndCreateHandler } from "@as-integrations/azure-functions";
import { resolvers } from "../graphql/index.ts";
import { typeDefs } from "../graphql/schema.ts";

const server = new ApolloServer({ typeDefs, resolvers });

export const graphqlHandler = startServerAndCreateHandler(server);
