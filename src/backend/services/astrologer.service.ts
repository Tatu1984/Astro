import type { AstrologerStatus, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

import { prisma } from "@/backend/database/client";
import type { CreateAstrologerInput } from "@/backend/validators/astrologer.validator";

export class AstrologerError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "AstrologerError";
  }
}

// Sensitive fields excluded from list/detail-safe responses. Sensitive
// data is only emitted from getAstrologerDetail (admin-only); never logged.
const SAFE_PROFILE_SELECT = {
  id: true,
  fullName: true,
  phone: true,
  city: true,
  state: true,
  country: true,
  kycType: true,
  qualifications: true,
  yearsExperience: true,
  specialties: true,
  bio: true,
  status: true,
  createdAt: true,
  user: {
    select: { id: true, email: true, role: true },
  },
} satisfies Prisma.AstrologerProfileSelect;

const STATUS_TRANSITIONS: Record<AstrologerStatus, AstrologerStatus[]> = {
  PENDING: ["ACTIVE", "SUSPENDED"],
  ACTIVE: ["SUSPENDED"],
  SUSPENDED: ["ACTIVE"],
};

function emptyToUndefined<T extends string | undefined>(v: T): T | undefined {
  return v === "" ? undefined : v;
}

/**
 * Admin-driven onboarding: creates a USER with role=ASTROLOGER plus the
 * AstrologerProfile in a single transaction. Sensitive fields (KYC,
 * banking) are stored plaintext in Phase 1 and must be encrypted before
 * any production rollout — see schema.prisma comments.
 */
export async function createAstrologerWithProfile(
  input: CreateAstrologerInput,
  actingAdminId: string,
) {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: input.email }, { phone: input.phone }],
    },
    select: { id: true, email: true, phone: true },
  });
  if (existing) {
    throw new AstrologerError(
      409,
      existing.email === input.email
        ? "an account with this email already exists"
        : "an account with this phone already exists",
    );
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        name: input.name,
        phone: input.phone,
        passwordHash,
        role: "ASTROLOGER",
      },
      select: { id: true, email: true, name: true, role: true },
    });

    await tx.astrologerProfile.create({
      data: {
        userId: user.id,
        fullName: input.name,
        phone: input.phone,
        alternatePhone: emptyToUndefined(input.alternatePhone),

        addressLine1: input.addressLine1,
        addressLine2: emptyToUndefined(input.addressLine2),
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        country: input.country,

        kycType: input.kycType,
        kycNumber: input.kycNumber,

        qualifications: emptyToUndefined(input.qualifications),
        yearsExperience: input.yearsExperience,
        specialties: input.specialties,
        bio: emptyToUndefined(input.bio),

        bankAccountName: emptyToUndefined(input.bankAccountName),
        bankAccountNumber: emptyToUndefined(input.bankAccountNumber),
        bankIfsc: emptyToUndefined(input.bankIfsc),
        upiId: emptyToUndefined(input.upiId),

        status: "PENDING",
        onboardedById: actingAdminId,
      },
    });

    return user;
  });
}

export async function listAstrologers() {
  return prisma.astrologerProfile.findMany({
    select: SAFE_PROFILE_SELECT,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

/**
 * Detail with sensitive fields. Use only in admin-gated handlers; never
 * log the returned object directly.
 */
export async function getAstrologerDetail(id: string) {
  const profile = await prisma.astrologerProfile.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, role: true, createdAt: true } },
      onboardedBy: { select: { id: true, email: true, name: true } },
    },
  });
  if (!profile) throw new AstrologerError(404, "astrologer not found");
  return profile;
}

/**
 * Self-service: an astrologer fetching their own profile. Returns
 * sensitive fields because they belong to the requester. Caller is
 * responsible for verifying that session.user.id matches the userId.
 */
export async function getOwnAstrologerProfile(userId: string) {
  return prisma.astrologerProfile.findUnique({
    where: { userId },
    include: {
      user: { select: { id: true, email: true, role: true, createdAt: true } },
    },
  });
}

export async function setAstrologerStatus(id: string, newStatus: AstrologerStatus) {
  const current = await prisma.astrologerProfile.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!current) throw new AstrologerError(404, "astrologer not found");

  const allowed = STATUS_TRANSITIONS[current.status];
  if (!allowed.includes(newStatus)) {
    throw new AstrologerError(
      400,
      `cannot transition from ${current.status} to ${newStatus}`,
    );
  }

  return prisma.astrologerProfile.update({
    where: { id },
    data: { status: newStatus },
    select: SAFE_PROFILE_SELECT,
  });
}
