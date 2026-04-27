import { fromZonedTime } from "date-fns-tz";

import { prisma } from "@/backend/database/client";
import type { CreateProfileInput } from "@/backend/validators/profile.validator";

export class ProfileError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ProfileError";
  }
}

const PROFILE_SOFT_CAP = 50;

function combineToUtc(input: CreateProfileInput): Date {
  // When time unknown, use noon local — minimises max error vs. true birth
  // moment given uniform-prior assumption over the 24-hour day.
  const time = input.unknownTime ? "12:00" : input.birthTime ?? "12:00";
  return fromZonedTime(`${input.birthDate}T${time}:00`, input.timezone);
}

export async function createProfile(input: CreateProfileInput, userId: string) {
  const count = await prisma.profile.count({
    where: { userId, deletedAt: null },
  });
  if (count >= PROFILE_SOFT_CAP) {
    throw new ProfileError(429, `profile limit (${PROFILE_SOFT_CAP}) reached`);
  }

  const utc = combineToUtc(input);

  return prisma.profile.create({
    data: {
      userId,
      kind: input.kind,
      fullName: input.fullName,
      birthDate: utc,
      birthTime: input.unknownTime ? null : utc,
      unknownTime: input.unknownTime,
      birthPlace: input.birthPlace,
      latitude: input.latitude,
      longitude: input.longitude,
      timezone: input.timezone,
      gender: input.gender || null,
      notes: input.notes || null,
      isPrivate: input.isPrivate,
    },
    select: {
      id: true,
      kind: true,
      fullName: true,
      birthDate: true,
      birthPlace: true,
      timezone: true,
      unknownTime: true,
      createdAt: true,
    },
  });
}

export async function listUserProfiles(userId: string) {
  return prisma.profile.findMany({
    where: { userId, deletedAt: null },
    select: {
      id: true,
      kind: true,
      fullName: true,
      birthDate: true,
      birthPlace: true,
      timezone: true,
      latitude: true,
      longitude: true,
      unknownTime: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function softDeleteProfile(profileId: string, userId: string) {
  const found = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { id: true, userId: true, deletedAt: true },
  });
  if (!found || found.deletedAt) throw new ProfileError(404, "profile not found");
  if (found.userId !== userId) throw new ProfileError(403, "forbidden");

  return prisma.profile.update({
    where: { id: profileId },
    data: { deletedAt: new Date() },
    select: { id: true },
  });
}
