//import type {PrismaClient} from "../../generated/prisma/client.ts";
import type {QueryResolvers} from "../../../generated/graphql.js";
import {GraphQLError} from "graphql";
import {z} from "zod";

export const getPets: QueryResolvers["pets"] = (_, __, contextValue) =>
    contextValue.db.pet.findMany({orderBy: {createdAt: "desc"}, include: {user: true}});

export const getPet: QueryResolvers["pet"] = (_, args, contextValue) => {

    const parsed = z.uuid().safeParse(args.id);

    if (!parsed.success) {
        throw new GraphQLError("Error de validación en los datos enviados", {
            extensions: {
                code: "BAD_USER_INPUT",
                validationErrors: z.flattenError(parsed.error).fieldErrors,
            },
        });
    }
    return contextValue.db.pet.findUnique({
        where: {id: parsed.data},
        include: {user: true},
    });
};

