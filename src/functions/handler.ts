import { ApolloServer } from "@apollo/server";
import { readFileSync } from "node:fs";
import { startServerAndCreateHandler } from "@as-integrations/azure-functions";
import { resolvers } from "../graphql/index.ts";
import { prisma } from "../../lib/prisma.ts";
import type { MyContext } from "../../main.ts";

const typeDefs = readFileSync(
  new URL("../graphql/schema.graphql", import.meta.url),
  "utf-8",
);
const server = new ApolloServer<MyContext>({ typeDefs, resolvers });

export const graphqlHandler = startServerAndCreateHandler(
  server as unknown as Parameters<typeof startServerAndCreateHandler>[0],
  { context: async () => ({ db: prisma }) },
);
