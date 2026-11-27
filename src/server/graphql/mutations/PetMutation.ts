import type { MutationResolvers } from "../../../generated/graphql.js";
import { z } from "zod";
import { GraphQLError } from "graphql";
import { createPhotoLostPet as createPhotoLostPetRecord } from "../../express/services/photoPetLost.ts";

const CreateLostPetSchema = z.object({
  name: z.string().min(1),
  contact: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  race: z.string().nullable().optional(),
  userId: z.uuid(),
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
  const result = await createPhotoLostPetRecord(args.input, contextValue.db);

  if (!result.ok) {
    throw new GraphQLError(result.error, {
      extensions: {
        code: result.status === 404 ? "NOT_FOUND" : "BAD_USER_INPUT",
        ...(result.fieldErrors ? { validationErrors: result.fieldErrors } : {}),
      },
    });
  }

  return result.photo;
};

export { createLostPet, createPhotoLostPet };
