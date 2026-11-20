import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { resolvers } from "./src/graphql/index.ts";
import { typeDefs } from "./src/graphql/schema.ts";

const server = new ApolloServer({ typeDefs, resolvers });

const port = Number(process.env.PORT ?? 5000);

const { url } = await startStandaloneServer(server, {
  listen: { port },
});

console.log(`GraphQL server ready at ${url}`);
