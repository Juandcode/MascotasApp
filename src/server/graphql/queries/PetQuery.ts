//import type {PrismaClient} from "../../generated/prisma/client.ts";
import type {QueryResolvers} from "../../../generated/graphql.js";
import {GraphQLError} from "graphql";

//type PetDelegate = PrismaClient["pet"];

// export const getPets: QueryResolvers["pets"] = (_, __, contextValue: MyContext) => () =>
//     contextValue.db.findMany({orderBy: {createdAt: "desc"}});
//
// export const getPet: QueryResolvers["pet"] =
//     (_, __, contextValue: MyContext) => (_parent: unknown, args: { id: string }) =>
//         contextValue.db.findUnique({where: {id: Number(args.id)}});
export const getPets: QueryResolvers["pets"] = (_, __, contextValue) =>
    contextValue.db.pet.findMany({orderBy: {createdAt: "desc"}, include: {user: true}});

export const getPet: QueryResolvers["pet"] = (_, args, contextValue) => {
    const id = Number(args.id);
    if (!Number.isInteger(id)) {
        throw new GraphQLError("ID inválido", {
            extensions: {code: "BAD_USER_INPUT"},
        });
    }
    return contextValue.db.pet.findUnique({
        where: {id},
        include: {user: true},
    });
};

