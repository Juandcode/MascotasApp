import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../src/generated/prisma/client.ts";
import { createPet } from "../src/graphql/mutations/PetMutation.ts";
import { getPet, getPets } from "../src/graphql/queries/PetQuery.ts";

type PetDelegate = PrismaClient["pet"];

const pet = {
  id: 1,
  name: "Michi",
  species: "Gato",
  age: 2,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

function createPetDelegate() {
  const delegate = {
    findMany: vi.fn().mockResolvedValue([pet]),
    findUnique: vi.fn().mockResolvedValue(pet),
    create: vi.fn().mockResolvedValue(pet),
  };

  return { delegate, petDelegate: delegate as unknown as PetDelegate };
}

describe("Pet queries", () => {
  it("returns pets ordered by createdAt desc", async () => {
    const { delegate, petDelegate } = createPetDelegate();
    const pets = getPets(petDelegate);

    await expect(pets()).resolves.toEqual([pet]);
    expect(delegate.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
    });
  });

  it("converts the string id to a number", async () => {
    const { delegate, petDelegate } = createPetDelegate();
    const petById = getPet(petDelegate);

    await expect(petById(null, { id: "1" })).resolves.toEqual(pet);
    expect(delegate.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});

describe("Pet mutations", () => {
  it("creates a pet with the provided input", async () => {
    const { delegate, petDelegate } = createPetDelegate();
    const create = createPet(petDelegate);
    const input = { name: "Michi", species: "Gato", age: 2 };

    await expect(create(null, { input })).resolves.toEqual(pet);
    expect(delegate.create).toHaveBeenCalledWith({ data: input });
  });
});
