import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../src/generated/prisma/client.ts";
import type { MyContext } from "../src/server/context.ts";
import { createUser } from "../src/server/graphql/mutations/UserMutation.ts";
import { getUser, getUsers } from "../src/server/graphql/queries/UserQuery.ts";

type UserDelegate = PrismaClient["user"];

const user = {
  id: "8f1f0b18-6b33-4a1e-9b23-7a9f1a0f0f0f",
  name: "Ana",
  pets: [],
};

function createContext() {
  const delegate = {
    findMany: vi.fn().mockResolvedValue([user]),
    findUnique: vi.fn().mockResolvedValue(user),
    create: vi.fn().mockResolvedValue(user),
  };

  const context = {
    db: { user: delegate as unknown as UserDelegate },
  } as MyContext;

  return { delegate, context };
}

describe("User queries", () => {
  it("returns users ordered by name with their pets", async () => {
    const { delegate, context } = createContext();
    const users = await getUsers({}, {}, context, {} as never);

    expect(users).toEqual([user]);
    expect(delegate.findMany).toHaveBeenCalledWith({
      orderBy: { name: "asc" },
      include: { pets: true },
    });
  });

  it("returns a user by id with their pets", async () => {
    const { delegate, context } = createContext();
    const userById = await getUser({}, { id: user.id }, context, {} as never);

    expect(userById).toEqual(user);
    expect(delegate.findUnique).toHaveBeenCalledWith({
      where: { id: user.id },
      include: { pets: true },
    });
  });
});

describe("User mutations", () => {
  it("creates a user with the provided input", async () => {
    const { delegate, context } = createContext();
    const input = { name: "Ana" };
    const created = await createUser({}, { input }, context, {} as never);

    expect(created).toEqual(user);
    expect(delegate.create).toHaveBeenCalledWith({
      data: input,
      include: { pets: true },
    });
  });
});
