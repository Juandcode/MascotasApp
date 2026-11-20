import type { PrismaClient } from "../../generated/prisma/client.ts";

type PetDelegate = PrismaClient["pet"];

export const getPets = (petDelegate: PetDelegate) => () =>
  petDelegate.findMany({ orderBy: { createdAt: "desc" } });

export const getPet =
  (petDelegate: PetDelegate) => (_parent: unknown, args: { id: string }) =>
    petDelegate.findUnique({ where: { id: Number(args.id) } });
