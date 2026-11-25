import type { PrismaClient } from "../generated/prisma/client.ts";

export type MyContext = { db: PrismaClient };
