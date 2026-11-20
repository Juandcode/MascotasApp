import { prisma } from "../../lib/prisma.ts";
import { createPet } from "./mutations/PetMutation.ts";
import { getPet, getPets } from "./queries/PetQuery.ts";

const petDelegate = prisma.pet;

export const resolvers = {
  Query: {
    pets: getPets(petDelegate),
    pet: getPet(petDelegate),
  },
  Mutation: {
    createPet: createPet(petDelegate),
  },
};
