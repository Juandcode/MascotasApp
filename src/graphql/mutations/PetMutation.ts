//import type { PrismaClient } from "../../generated/prisma/client.ts";
import type {MutationResolvers} from "../../generated/graphql.js";
//type PetDelegate = PrismaClient["pet"];

type CreatePetInput = {
    name: string;
    species: string;
    age?: number | null;
};

// export const createPet =
//   (petDelegate: PetDelegate) =>
//   (_parent: unknown, args: { input: CreatePetInput }) =>
//     petDelegate.create({ data: args.input });


export const createPet: MutationResolvers["createPet"] =
    (_, args: { input: CreatePetInput }, contextValue) =>
            contextValue.db.pet.create({data: args.input});
