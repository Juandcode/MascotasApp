import type {QueryResolvers} from "../../../generated/graphql.js";

export const getUsers: QueryResolvers["users"] = (_, __, contextValue) =>
    contextValue.db.user.findMany({
        orderBy: {name: "asc"},
        include: {pets: true},
    });

export const getUser: QueryResolvers["user"] = (_, args, contextValue) =>
    contextValue.db.user.findUnique({
        where: {id: args.id},
        include: {pets: true},
    });

