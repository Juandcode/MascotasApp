//import {prisma} from "../infrastructure/prisma.ts";
import { createLostPet, createPhotoLostPet } from "./mutations/PetMutation.ts";
import { createUser } from "./mutations/UserMutation.ts";
import { getPet, getPets } from "./queries/PetQuery.ts";
import { getUser, getUsers } from "./queries/UserQuery.ts";
import { DateTimeResolver } from "graphql-scalars";
import { Resolvers } from "../../generated/graphql.js";

export const resolvers: Resolvers = {
  Query: {
    pets: getPets,
    pet: getPet,
    users: getUsers,
    user: getUser,
  },
  Mutation: {
    createLostPet: createLostPet,
    createPhotoLostPet: createPhotoLostPet,
    createUser: createUser,
  },
  DateTime: DateTimeResolver,
};
