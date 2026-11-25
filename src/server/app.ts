import {ApolloServer} from "@apollo/server";
import {ApolloServerPluginDrainHttpServer} from "@apollo/server/plugin/drainHttpServer";
// import { expressMiddleware } from "@as-integrations/express5";
// import cors from "cors";
import express, {
    type Express,
    // type NextFunction,
    // type Request,
    // type Response,
} from "express";
import {readFileSync} from "node:fs";
import {type Server, createServer} from "node:http";
import type {MyContext} from "./context.ts";
import {graphqlLoggingPlugin} from "./graphql/loggingPlugin.ts";
import {resolvers} from "./graphql/index.ts";
// import { prisma } from "./infrastructure/prisma.ts";
// import { uploadRouter } from "./uploads/uploadRouter.ts";
import {createHttpServer} from "./express/indexs.js";

const typeDefs = readFileSync(
    new URL("./graphql/schema.graphql", import.meta.url),
    "utf-8", 
);

export type ServerApp = {
    app: Express;
    httpServer: Server;
    apolloServer: ApolloServer<MyContext>;
};

export async function createServerApp(): Promise<ServerApp> {
    const app = express();
    const httpServer = createServer(app);

    const apolloServer = new ApolloServer<MyContext>({
        typeDefs,
        resolvers,
        plugins: [
            ApolloServerPluginDrainHttpServer({httpServer}),
            graphqlLoggingPlugin,
        ]
    });

    await apolloServer.start();

    createHttpServer(apolloServer, httpServer, app);

    return {app, httpServer, apolloServer};
}
