import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../src/generated/prisma/client.ts";
import type { MyContext } from "../src/server/context.ts";
import { createLostPet, createPhotoLostPet } from "../src/server/graphql/mutations/PetMutation.ts";
import { getPet, getPets } from "../src/server/graphql/queries/PetQuery.ts";

type PetLostDelegate = PrismaClient["petLost"];

const pet = {
  id: "0f3b9a2e-4c1d-4f7a-9e2b-1a2b3c4d5e6f",
  name: "Michi",
  contact: "+52 555 000 0000",
  color: "negro",
  race: "gato",
  state: "perdido",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  userId: "8f1f0b18-6b33-4a1e-9b23-7a9f1a0f0f0f",
};

function createContext() {
  const delegate = {
    findMany: vi.fn().mockResolvedValue([pet]),
    findUnique: vi.fn().mockResolvedValue(pet),
    create: vi.fn().mockResolvedValue(pet),
  };

  const context = {
    db: { petLost: delegate as unknown as PetLostDelegate },
  } as MyContext;

  return { delegate, context };
}

describe("PetLost queries", () => {
  it("returns pets ordered by createdAt desc", async () => {
    const { delegate, context } = createContext();
    const pets = await getPets({}, {}, context, {} as never);

    expect(pets).toEqual([pet]);
    expect(delegate.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      include: { user: true },
    });
  });

  it("looks up a pet by UUID", async () => {
    const { delegate, context } = createContext();
    const petById = await getPet({}, { id: pet.id }, context, {} as never);

    expect(petById).toEqual(pet);
    expect(delegate.findUnique).toHaveBeenCalledWith({
      where: { id: pet.id },
      include: { user: true },
    });
  });

  it("rejects an id that is not a UUID", async () => {
    const { delegate, context } = createContext();

    await expect(async () => getPet({}, { id: "1" }, context, {} as never)).rejects.toMatchObject({
      extensions: { code: "BAD_USER_INPUT" },
    });
    expect(delegate.findUnique).not.toHaveBeenCalled();
  });
});

describe("PetLost mutations", () => {
  it("creates a lost pet with the provided input", async () => {
    const { delegate, context } = createContext();
    const input = {
      name: "Michi",
      contact: "+52 555 000 0000",
      color: "negro",
      race: "gato",
      userId: pet.userId,
    };
    const created = await createLostPet({}, { input }, context, {} as never);

    expect(created).toEqual(pet);
    expect(delegate.create).toHaveBeenCalledWith({ data: input, include: { user: true } });
  });

  it("creates a photo for an existing pet", async () => {
    const photo = {
      id: "3d9e4f56-7081-4c0b-9e2f-3a4b5c6d7e8f",
      petId: pet.id,
      key: "uploads/key.png",
      url: "https://bucket/uploads/key.png",
    };
    const create = vi.fn().mockResolvedValue(photo);
    const context = { db: { photoPetLost: { create } } } as unknown as MyContext;
    const input = { key: photo.key, url: photo.url, petId: pet.id };

    const created = await createPhotoLostPet({}, { input }, context, {} as never);

    expect(created).toEqual(photo);
    expect(create).toHaveBeenCalledWith({ data: input, include: { petLost: true } });
  });

  it("rejects a photo with an invalid pet id", async () => {
    const create = vi.fn();
    const context = { db: { photoPetLost: { create } } } as unknown as MyContext;

    await expect(
      createPhotoLostPet(
        {},
        { input: { key: "uploads/key.png", url: "https://bucket/key.png", petId: "1" } },
        context,
        {} as never,
      ),
    ).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
    expect(create).not.toHaveBeenCalled();
  });
});
