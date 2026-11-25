import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { expressMiddleware } from "@as-integrations/express5";
import cors from "cors";
import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { MyContext } from "./context.ts";
import { graphqlLoggingPlugin } from "./graphql/loggingPlugin.ts";
import { resolvers } from "./graphql/index.ts";
import { prisma } from "./infrastructure/prisma.ts";
import { uploadRouter } from "./uploads/uploadRouter.ts";

const typeDefs = readFileSync(
  new URL("./graphql/schema.graphql", import.meta.url),
  "utf-8",
);

export type ServerApp = {
  app: Express;
  httpServer: Server;
  apolloServer: ApolloServer<MyContext>;
};

function resolveErrorStatus(error: unknown): number {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number" &&
    error.status >= 400 &&
    error.status < 600
  ) {
    return error.status;
  }

  return 500;
}

export async function createServerApp(): Promise<ServerApp> {
  const app = express();
  const httpServer = createServer(app);

  const apolloServer = new ApolloServer<MyContext>({
    typeDefs,
    resolvers,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      graphqlLoggingPlugin,
    ],
  });

  await apolloServer.start();

  app.disable("x-powered-by");
  app.use(cors());
  app.use((request, _response, next) => {
    console.log(`[http] ${request.method} ${request.path}`);
    next();
  });
  app.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });
  app.use("/api/upload", uploadRouter);
  app.use(express.json({ limit: "50mb" }));
  app.use(
    expressMiddleware(apolloServer, {
      context: async () => ({ db: prisma }),
    }),
  );
  app.use((error: unknown, _request: Request, response: Response, next: NextFunction) => {
    const status = resolveErrorStatus(error);

    if (status >= 500) {
      console.error(`[http] unhandled error status=${status}`, error);
    } else {
      console.log(`[http] request error status=${status}`);
    }

    if (response.headersSent) {
      next(error);
      return;
    }

    response
      .status(status)
      .json({ error: status >= 500 ? "Error interno del servidor" : "Solicitud inválida" });
  });

  return { app, httpServer, apolloServer };
}
