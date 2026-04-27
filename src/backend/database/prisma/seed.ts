/**
 * Seed three dev accounts (single-user testing). Run with `npm run db:seed`.
 * Idempotent: safe to re-run; existing users keep their charts.
 */

import type { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

import { prisma } from "../client";

interface SeedAccount {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  profile: {
    fullName: string;
    birthDateUtc: string; // ISO
    birthPlace: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
}

const ACCOUNTS: SeedAccount[] = [
  {
    email: "admin@astro.local",
    password: "Admin@2026!",
    name: "Admin User",
    role: "ADMIN",
    profile: {
      fullName: "Admin",
      birthDateUtc: "1990-05-15T14:30:00Z",
      birthPlace: "New Delhi, India",
      latitude: 28.6139,
      longitude: 77.209,
      timezone: "Asia/Kolkata",
    },
  },
  {
    email: "user1@astro.local",
    password: "User1@2026!",
    name: "Test User One",
    role: "USER",
    profile: {
      fullName: "User One",
      birthDateUtc: "1988-09-22T03:15:00Z",
      birthPlace: "London, United Kingdom",
      latitude: 51.5074,
      longitude: -0.1278,
      timezone: "Europe/London",
    },
  },
  {
    email: "user2@astro.local",
    password: "User2@2026!",
    name: "Test User Two",
    role: "USER",
    profile: {
      fullName: "User Two",
      birthDateUtc: "1995-12-03T09:45:00Z",
      birthPlace: "New York, NY, USA",
      latitude: 40.7128,
      longitude: -74.006,
      timezone: "America/New_York",
    },
  },
];

async function upsertAccount(acc: SeedAccount) {
  const passwordHash = await bcrypt.hash(acc.password, 12);
  const user = await prisma.user.upsert({
    where: { email: acc.email },
    create: {
      email: acc.email,
      name: acc.name,
      passwordHash,
      role: acc.role,
    },
    update: {
      name: acc.name,
      passwordHash, // refresh in case password constants change between seeds
      role: acc.role,
    },
  });

  const existing = await prisma.profile.findFirst({
    where: { userId: user.id, fullName: acc.profile.fullName },
  });

  if (!existing) {
    await prisma.profile.create({
      data: {
        userId: user.id,
        kind: "SELF",
        fullName: acc.profile.fullName,
        birthDate: new Date(acc.profile.birthDateUtc),
        birthTime: new Date(acc.profile.birthDateUtc),
        unknownTime: false,
        birthPlace: acc.profile.birthPlace,
        latitude: acc.profile.latitude,
        longitude: acc.profile.longitude,
        timezone: acc.profile.timezone,
      },
    });
  }

  return user;
}

async function main() {
  console.log("seeding accounts…");
  for (const acc of ACCOUNTS) {
    const u = await upsertAccount(acc);
    console.log(`  ✓ ${acc.email}  (${u.id})`);
  }
  console.log("done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
