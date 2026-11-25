import { ApolloServer } from "@apollo/server";
import { readFileSync } from "node:fs";
import { startServerAndCreateHandler } from "@as-integrations/azure-functions";
import { graphqlLoggingPlugin } from "../graphql/loggingPlugin.ts";
import { resolvers } from "../graphql/index.ts";
import { prisma } from "../infrastructure/prisma.ts";
import type { MyContext } from "../context.ts";

const typeDefs = readFileSync(new URL("../graphql/schema.graphql", import.meta.url), "utf-8");
const server = new ApolloServer<MyContext>({
  typeDefs,
  resolvers,
  plugins: [graphqlLoggingPlugin],
});

console.log("[functions] Apollo Server configured for Azure Functions");

export const graphqlHandler = startServerAndCreateHandler(
  server as unknown as Parameters<typeof startServerAndCreateHandler>[0],
  { context: async () => ({ db: prisma }) },
);
