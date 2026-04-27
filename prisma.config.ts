import "dotenv/config";
import path from "node:path";
import type { PrismaConfig } from "prisma";

export default {
  schema: path.join("src", "backend", "database", "prisma", "schema.prisma"),
  migrations: {
    path: path.join("src", "backend", "database", "prisma", "migrations"),
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
} satisfies PrismaConfig;
