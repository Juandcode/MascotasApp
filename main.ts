import { ApolloServer } from "@apollo/server";
import { readFileSync } from 'fs';
import { startStandaloneServer } from "@apollo/server/standalone";
import { resolvers } from "./src/graphql/index.ts";
import {prisma} from "./lib/prisma.js";
import type { PrismaClient } from "./src/generated/prisma/client.js";
//import { typeDefs } from "./src/graphql/schema.ts";

const typeDefs = readFileSync('./src/graphql/schema.graphql', { encoding: 'utf-8' });

export type MyContext = { db: PrismaClient };

const server = new ApolloServer<MyContext>({ typeDefs, resolvers });

const port = Number(process.env.PORT ?? 5000);

const { url } = await startStandaloneServer(server, {
  listen: { port },
  context: async () => ({ db: prisma }),
});

console.log(`GraphQL server ready at ${url}`);
