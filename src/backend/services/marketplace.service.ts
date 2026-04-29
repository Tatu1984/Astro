import type { Prisma } from "@prisma/client";

import { prisma } from "@/backend/database/client";
import type {
  CreateServiceInput,
  ReplaceScheduleInput,
  ScheduleExceptionInput,
  UpdateServiceInput,
} from "@/backend/validators/marketplace.validator";

export class MarketplaceError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "MarketplaceError";
  }
}

export async function getAstrologerProfileByUserId(userId: string) {
  return prisma.astrologerProfile.findUnique({
    where: { userId },
    select: { id: true, status: true, userId: true, fullName: true },
  });
}

export async function requireOwnAstrologerProfile(userId: string) {
  const profile = await getAstrologerProfileByUserId(userId);
  if (!profile) throw new MarketplaceError(404, "astrologer profile not found");
  return profile;
}

export async function listOwnServices(astrologerProfileId: string) {
  return prisma.astrologerService.findMany({
    where: { astrologerProfileId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createService(astrologerProfileId: string, input: CreateServiceInput) {
  return prisma.astrologerService.create({
    data: { astrologerProfileId, ...input },
  });
}

export async function updateService(
  astrologerProfileId: string,
  serviceId: string,
  input: UpdateServiceInput,
) {
  const existing = await prisma.astrologerService.findUnique({
    where: { id: serviceId },
    select: { astrologerProfileId: true },
  });
  if (!existing) throw new MarketplaceError(404, "service not found");
  if (existing.astrologerProfileId !== astrologerProfileId) {
    throw new MarketplaceError(403, "not your service");
  }
  return prisma.astrologerService.update({
    where: { id: serviceId },
    data: input,
  });
}

export async function deleteService(astrologerProfileId: string, serviceId: string) {
  const existing = await prisma.astrologerService.findUnique({
    where: { id: serviceId },
    select: { astrologerProfileId: true },
  });
  if (!existing) throw new MarketplaceError(404, "service not found");
  if (existing.astrologerProfileId !== astrologerProfileId) {
    throw new MarketplaceError(403, "not your service");
  }
  return prisma.astrologerService.delete({ where: { id: serviceId } });
}

export async function getSchedule(astrologerProfileId: string) {
  const [slots, exceptions] = await Promise.all([
    prisma.astrologerSchedule.findMany({
      where: { astrologerProfileId },
      orderBy: [{ weekday: "asc" }, { startMinutes: "asc" }],
    }),
    prisma.scheduleException.findMany({
      where: { astrologerProfileId, date: { gte: new Date() } },
      orderBy: { date: "asc" },
    }),
  ]);
  return { slots, exceptions };
}

export async function replaceSchedule(astrologerProfileId: string, input: ReplaceScheduleInput) {
  return prisma.$transaction(async (tx) => {
    await tx.astrologerSchedule.deleteMany({ where: { astrologerProfileId } });
    if (input.slots.length === 0) return [];
    await tx.astrologerSchedule.createMany({
      data: input.slots.map((s) => ({
        astrologerProfileId,
        weekday: s.weekday,
        startMinutes: s.startMinutes,
        endMinutes: s.endMinutes,
        timezone: s.timezone,
      })),
    });
    return tx.astrologerSchedule.findMany({
      where: { astrologerProfileId },
      orderBy: [{ weekday: "asc" }, { startMinutes: "asc" }],
    });
  });
}

export async function createScheduleException(
  astrologerProfileId: string,
  input: ScheduleExceptionInput,
) {
  return prisma.scheduleException.create({
    data: {
      astrologerProfileId,
      date: new Date(`${input.date}T00:00:00.000Z`),
      isAvailable: input.isAvailable,
      startMinutes: input.startMinutes,
      endMinutes: input.endMinutes,
    },
  });
}

export async function deleteScheduleException(astrologerProfileId: string, exceptionId: string) {
  const existing = await prisma.scheduleException.findUnique({
    where: { id: exceptionId },
    select: { astrologerProfileId: true },
  });
  if (!existing) throw new MarketplaceError(404, "exception not found");
  if (existing.astrologerProfileId !== astrologerProfileId) {
    throw new MarketplaceError(403, "not your exception");
  }
  return prisma.scheduleException.delete({ where: { id: exceptionId } });
}

// =========================
// Public directory listing
// =========================

export type DirectoryFilter = {
  language?: string;
  specialty?: string;
  priceMin?: number;
  priceMax?: number;
  kind?: "CHAT" | "VOICE" | "VIDEO" | "REPORT";
};

export async function listPublicAstrologers(filter: DirectoryFilter = {}) {
  const where: Prisma.AstrologerProfileWhereInput = {
    status: "ACTIVE",
  };
  if (filter.language) where.languages = { has: filter.language };
  if (filter.specialty) where.specialties = { has: filter.specialty };
  if (filter.kind || filter.priceMin != null || filter.priceMax != null) {
    where.services = {
      some: {
        isActive: true,
        ...(filter.kind ? { kind: filter.kind } : {}),
        ...(filter.priceMin != null ? { priceInr: { gte: filter.priceMin } } : {}),
        ...(filter.priceMax != null ? { priceInr: { lte: filter.priceMax } } : {}),
      },
    };
  }
  return prisma.astrologerProfile.findMany({
    where,
    orderBy: [{ averageRating: "desc" }, { ratingCount: "desc" }],
    select: {
      id: true,
      fullName: true,
      city: true,
      bio: true,
      languages: true,
      specialties: true,
      yearsExperience: true,
      averageRating: true,
      ratingCount: true,
      user: { select: { id: true, image: true } },
      services: {
        where: { isActive: true },
        select: { id: true, kind: true, title: true, priceInr: true, durationMin: true },
      },
    },
  });
}

export async function getPublicAstrologer(astrologerProfileId: string) {
  const profile = await prisma.astrologerProfile.findUnique({
    where: { id: astrologerProfileId },
    select: {
      id: true,
      fullName: true,
      city: true,
      state: true,
      country: true,
      qualifications: true,
      yearsExperience: true,
      specialties: true,
      languages: true,
      bio: true,
      averageRating: true,
      ratingCount: true,
      status: true,
      user: { select: { id: true, image: true } },
      services: {
        where: { isActive: true },
        orderBy: { priceInr: "asc" },
      },
      schedules: { orderBy: [{ weekday: "asc" }, { startMinutes: "asc" }] },
      scheduleExceptions: {
        where: { date: { gte: new Date() } },
        orderBy: { date: "asc" },
      },
      reviews: {
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true, image: true } } },
      },
    },
  });
  if (!profile || profile.status !== "ACTIVE") return null;
  return profile;
}
