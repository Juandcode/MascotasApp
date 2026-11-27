import { z } from "zod";
import type { PetLost, PhotoPetLost, PrismaClient } from "../../../generated/prisma/client.ts";
import { prisma } from "../../infrastructure/prisma.ts";

export const CreatePhotoLostPetSchema = z.object({
  key: z.string().min(1),
  url: z.string().min(1),
  petId: z.uuid(),
});

export type CreatePhotoLostPetInput = z.infer<typeof CreatePhotoLostPetSchema> & {
  idUser?: string;
};

export type PhotoPetLostWithPet = PhotoPetLost & { petLost: PetLost };

export type CreatePhotoLostPetResult =
  | { ok: true; photo: PhotoPetLostWithPet }
  | {
      ok: false;
      status: 400 | 404;
      error: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

export async function createPhotoLostPet(
  input: CreatePhotoLostPetInput,
  db: PrismaClient = prisma,
): Promise<CreatePhotoLostPetResult> {
  const parsed = CreatePhotoLostPetSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: "Error de validación en los datos enviados",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  if (input.idUser) {
    const pet = await db.petLost.findUnique({
      where: { id: parsed.data.petId },
      select: { userId: true },
    });

    if (!pet) {
      return { ok: false, status: 404, error: "La mascota no existe" };
    }

    if (pet.userId !== input.idUser) {
      return { ok: false, status: 400, error: "La mascota no pertenece al usuario" };
    }
  }

  const photo = await db.photoPetLost.create({
    data: parsed.data,
    include: { petLost: true },
  });

  return { ok: true, photo };
}
