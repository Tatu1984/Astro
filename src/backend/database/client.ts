import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@/config/env";

declare global {
  var __prisma: PrismaClient | undefined;
}

function makeClient() {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalThis.__prisma ?? makeClient();

if (env.NODE_ENV !== "production") globalThis.__prisma = prisma;
