//import {prisma} from "../infrastructure/prisma.ts";
import {createPet} from "./mutations/PetMutation.ts";
import {createUser} from "./mutations/UserMutation.ts";
import {getPet, getPets} from "./queries/PetQuery.ts";
import {getUser, getUsers} from "./queries/UserQuery.ts";
import {DateTimeResolver} from 'graphql-scalars';
import {Resolvers} from "../../generated/graphql.js"

//const petDelegate = prisma.pet;


export const resolvers: Resolvers = {
    Query: {
        pets: getPets,
        pet: getPet,
        users: getUsers,
        user: getUser,
    },
    Mutation: {
        createPet: createPet,
        createUser: createUser,
    },
    DateTime: DateTimeResolver
};
