//import {prisma} from "../../lib/prisma.ts";
import {createPet} from "./mutations/PetMutation.ts";
import {getPet, getPets} from "./queries/PetQuery.ts";
import {DateTimeResolver} from 'graphql-scalars';
import {Resolvers} from "../generated/graphql.js"

//const petDelegate = prisma.pet;


export const resolvers: Resolvers = {
    Query: {
        pets: getPets,
        pet: getPet,
    },
    Mutation: {
        createPet: createPet,
    },
    DateTime: DateTimeResolver
};
