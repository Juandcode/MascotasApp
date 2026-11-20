import type { PrismaClient } from "../../generated/prisma/client.ts";

type PetDelegate = PrismaClient["pet"];

type CreatePetInput = {
  name: string;
  species: string;
  age?: number | null;
};

export const createPet =
  (petDelegate: PetDelegate) =>
  (_parent: unknown, args: { input: CreatePetInput }) =>
    petDelegate.create({ data: args.input });
