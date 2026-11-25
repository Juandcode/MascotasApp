//import type { PrismaClient } from "../../generated/prisma/client.ts";
import type { MutationResolvers } from "../../../generated/graphql.js";
import { z } from "zod";
import { GraphQLError } from "graphql";
//type PetDelegate = PrismaClient["pet"];

const CreatePetSchema = z.object({
  name: z.string().min(1),
  species: z.string().min(1),
  age: z.number().int().nonnegative().nullable().optional(),
  userId: z.uuid(),
});

type CreatePetInput = {
  name: string;
  species: string;
  age?: number | null;
  userId: string;
};

// export const createPet =
//   (petDelegate: PetDelegate) =>
//   (_parent: unknown, args: { input: CreatePetInput }) =>
//     petDelegate.create({ data: args.input });

export const createPet: MutationResolvers["createPet"] = async (
  _,
  args: { input: CreatePetInput },
  contextValue,
) => {
  const parsed = CreatePetSchema.safeParse(args.input);

  if (!parsed.success) {
    throw new GraphQLError("Error de validación en los datos enviados", {
      extensions: {
        code: "BAD_USER_INPUT",
        validationErrors: z.flattenError(parsed.error).fieldErrors,
      },
    });
  }
  const { name, species, age, userId } = parsed.data;
  return contextValue.db.pet.create({
    data: {
      name,
      species,
      age,
      userId,
    },
  });
};
