import { config as loadEnv } from "dotenv";
import path from "node:path";
import type { PrismaConfig } from "prisma";

// Mirror Next.js: prefer .env.local, then .env. CI provides DATABASE_URL via env directly.
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

export default {
  schema: path.join("src", "backend", "database", "prisma", "schema.prisma"),
  migrations: {
    path: path.join("src", "backend", "database", "prisma", "migrations"),
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
} satisfies PrismaConfig;
