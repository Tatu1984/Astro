import bcrypt from "bcryptjs";

import { prisma } from "@/backend/database/client";
import type { CreateAstrologerInput } from "@/backend/validators/astrologer.validator";

export class AstrologerError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "AstrologerError";
  }
}

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
