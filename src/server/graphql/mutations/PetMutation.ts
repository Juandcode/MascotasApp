import type { MutationResolvers } from "../../../generated/graphql.js";
import { z } from "zod";
import { GraphQLError } from "graphql";

const CreateLostPetSchema = z.object({
  name: z.string().min(1),
  contact: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  race: z.string().nullable().optional(),
  userId: z.uuid(),
});
const CreatePhotoLostPetSchema = z.object({
  key: z.string().min(1),
  url: z.string().min(1),
  petId: z.uuid(),
});

const createLostPet: MutationResolvers["createLostPet"] = async (_, args, contextValue) => {
  const parsed = CreateLostPetSchema.safeParse(args.input);

  if (!parsed.success) {
    throw new GraphQLError("Error de validación en los datos enviados", {
      extensions: {
        code: "BAD_USER_INPUT",
        validationErrors: z.flattenError(parsed.error).fieldErrors,
      },
    });
  }

  return contextValue.db.petLost.create({
    data: parsed.data,
    include: { user: true },
  });
};

const createPhotoLostPet: MutationResolvers["createPhotoLostPet"] = async (
  _,
  args,
  contextValue,
) => {
  const parsed = CreatePhotoLostPetSchema.safeParse(args.input);

  if (!parsed.success) {
    throw new GraphQLError("Error de validación en los datos enviados", {
      extensions: {
        code: "BAD_USER_INPUT",
        validationErrors: z.flattenError(parsed.error).fieldErrors,
      },
    });
  }

  return contextValue.db.photoPetLost.create({
    data: parsed.data,
    include: { petLost: true },
  });
};

export { createLostPet, createPhotoLostPet };
