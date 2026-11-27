import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../src/generated/prisma/client.ts";
import { createPhotoLostPet } from "../src/server/express/services/photoPetLost.ts";

vi.hoisted(() => {
  process.env.DATABASE_URL ??= "postgresql://user:pass@localhost:5432/test";
});

const USER_ID = "8f1f0b18-6b33-4a1e-9b23-7a9f1a0f0f0f";
const OTHER_USER_ID = "2c8d3e45-6f70-4b9a-8d1e-2f3a4b5c6d7e";
const PET_ID = "1b7c2d34-5e6f-4a8b-9c0d-1e2f3a4b5c6d";
const PHOTO = {
  id: "3d9e4f56-7081-4c0b-9e2f-3a4b5c6d7e8f",
  petId: PET_ID,
  key: "uploads/key.png",
  url: "https://bucket/uploads/key.png",
};

function createDb(pet: { userId: string } | null = { userId: USER_ID }) {
  const findUnique = vi.fn().mockResolvedValue(pet);
  const create = vi.fn().mockResolvedValue(PHOTO);
  const db = {
    petLost: { findUnique },
    photoPetLost: { create },
  } as unknown as PrismaClient;

  return { findUnique, create, db };
}

const input = { key: PHOTO.key, url: PHOTO.url, petId: PET_ID };

describe("createPhotoLostPet", () => {
  it("crea la foto cuando la mascota pertenece al usuario", async () => {
    const { findUnique, create, db } = createDb();

    const result = await createPhotoLostPet(db, { ...input, idUser: USER_ID });

    expect(result).toEqual({ ok: true, photo: PHOTO });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: PET_ID },
      select: { userId: true },
    });
    expect(create).toHaveBeenCalledWith({ data: input, include: { petLost: true } });
  });

  it("no verifica el dueño cuando no se pasa idUser", async () => {
    const { findUnique, create, db } = createDb();

    const result = await createPhotoLostPet(db, input);

    expect(result).toEqual({ ok: true, photo: PHOTO });
    expect(findUnique).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith({ data: input, include: { petLost: true } });
  });

  it("rechaza una mascota inexistente", async () => {
    const { create, db } = createDb(null);

    const result = await createPhotoLostPet(db, { ...input, idUser: USER_ID });

    expect(result).toMatchObject({ ok: false, status: 404 });
    expect(create).not.toHaveBeenCalled();
  });

  it("rechaza una mascota de otro usuario", async () => {
    const { create, db } = createDb({ userId: OTHER_USER_ID });

    const result = await createPhotoLostPet(db, { ...input, idUser: USER_ID });

    expect(result).toMatchObject({ ok: false, status: 400 });
    expect(create).not.toHaveBeenCalled();
  });

  it("rechaza datos inválidos sin tocar la base de datos", async () => {
    const { findUnique, create, db } = createDb();

    const result = await createPhotoLostPet(db, { ...input, petId: "1", idUser: USER_ID });

    expect(result).toMatchObject({ ok: false, status: 400 });
    if (!result.ok) {
      expect(result.fieldErrors?.petId).toBeDefined();
    }
    expect(findUnique).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
