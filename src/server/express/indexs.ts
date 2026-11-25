import type {Server} from "node:http";
import cors from "cors";
import {uploadRouter} from "../uploads/uploadRouter.js";
import express, {Express, NextFunction, Request, Response} from "express";
import {expressMiddleware} from "@as-integrations/express5";
import {prisma} from "../infrastructure/prisma.js";
import type {ApolloServer} from "@apollo/server";
import {MyContext} from "../context.js";

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

export const createHttpServer = (apolloServer: ApolloServer<MyContext>,  httpServer: Server, app: Express) => {
    app.disable("x-powered-by");
    app.use(cors());
    app.use(express.json());
    app.use((request, _response, next) => {
        console.log(`[http] ${request.method} ${request.path}`);
        next();
    });
    app.get("/health", (_request, response) => {
        response.status(200).json({status: "ok"});
    });
    app.use("/api/upload", uploadRouter);
    app.use(express.json({limit: "50mb"}));
    app.use(
        '/graphql',
        cors(),
        express.json(),
        expressMiddleware(apolloServer, {
            context: async ({req}) => {
                const token = req.headers.authorization || '';
                return {db: prisma}
            },
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
            .json({error: status >= 500 ? "Error interno del servidor" : "Solicitud inválida"});
    });
}
