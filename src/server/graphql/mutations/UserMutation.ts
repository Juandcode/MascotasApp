import type {MutationResolvers} from "../../../generated/graphql.js";

export const createUser: MutationResolvers["createUser"] =
    (_, args, contextValue) =>
        contextValue.db.user.create({
            data: args.input,
            include: {pets: true},
        });
