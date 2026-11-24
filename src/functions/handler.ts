import { ApolloServer } from "@apollo/server";
import { readFileSync } from 'fs';
import { startServerAndCreateHandler } from "@as-integrations/azure-functions";
import { resolvers } from "../graphql/index.ts";
//import { typeDefs } from "../graphql/schema.ts";

const typeDefs = readFileSync('../graphql/schema.graphql', { encoding: 'utf-8' });
const server = new ApolloServer({ typeDefs, resolvers });

export const graphqlHandler = startServerAndCreateHandler(
  server as unknown as Parameters<typeof startServerAndCreateHandler>[0],
);
