import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../src/generated/prisma/client.ts";
import type { MyContext } from "../src/server/context.ts";
import { createPet } from "../src/server/graphql/mutations/PetMutation.ts";
import { getPet, getPets } from "../src/server/graphql/queries/PetQuery.ts";

type PetDelegate = PrismaClient["pet"];

const pet = {
  id: 1,
  name: "Michi",
  species: "Gato",
  age: 2,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

function createContext() {
  const delegate = {
    findMany: vi.fn().mockResolvedValue([pet]),
    findUnique: vi.fn().mockResolvedValue(pet),
    create: vi.fn().mockResolvedValue(pet),
  };

  const context = {
    db: { pet: delegate as unknown as PetDelegate },
  } as MyContext;

  return { delegate, context };
}

describe("Pet queries", () => {
  it("returns pets ordered by createdAt desc", async () => {
    const { delegate, context } = createContext();
    const pets = await getPets({}, {}, context, {} as never);

    expect(pets).toEqual([pet]);
    expect(delegate.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      include: { user: true },
    });
  });

  it("converts the string id to a number", async () => {
    const { delegate, context } = createContext();
    const petById = await getPet({}, { id: "1" }, context, {} as never);

    expect(petById).toEqual(pet);
    expect(delegate.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: { user: true },
    });
  });

  it("rejects an id that is not an integer", async () => {
    const { delegate, context } = createContext();

    await expect(
      async () => getPet({}, { id: "abc" }, context, {} as never),
    ).rejects.toMatchObject({
      extensions: { code: "BAD_USER_INPUT" },
    });
    expect(delegate.findUnique).not.toHaveBeenCalled();
  });
});

describe("Pet mutations", () => {
  it("creates a pet with the provided input", async () => {
    const { delegate, context } = createContext();
    const input = { name: "Michi", species: "Gato", age: 2 };
    const created = await createPet({}, { input }, context, {} as never);

    expect(created).toEqual(pet);
    expect(delegate.create).toHaveBeenCalledWith({ data: input });
  });
});
