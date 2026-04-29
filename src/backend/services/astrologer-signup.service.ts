import bcrypt from "bcryptjs";

import { signUserToken } from "@/backend/auth/jwt";
import { prisma } from "@/backend/database/client";
import type { AstrologerSignupInput } from "@/backend/validators/astrologer-signup.validator";

export class AstrologerSignupError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "AstrologerSignupError";
  }
}

/**
 * Public astrologer self-signup. Creates a USER with role=ASTROLOGER plus
 * a minimal AstrologerProfile (status=PENDING, onboardingStep=PROFILE_SUBMITTED).
 * Address + KYC fields are filled later via the onboarding flow + KycDocument
 * uploads. Admins still review and flip status to ACTIVE.
 */
export async function signupAstrologer(input: AstrologerSignupInput): Promise<{
  token: string;
  user: { id: string; email: string | null; name: string | null; role: string };
  astrologerProfileId: string;
  onboardingStep: string;
}> {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { phone: input.phone }] },
    select: { id: true, email: true, phone: true },
  });
  if (existing) {
    throw new AstrologerSignupError(
      409,
      existing.email === input.email
        ? "an account with this email already exists"
        : "an account with this phone already exists",
    );
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        name: input.fullName,
        phone: input.phone,
        passwordHash,
        role: "ASTROLOGER",
      },
      select: { id: true, email: true, name: true, role: true },
    });

    // Address + KYC are required by the existing admin-onboarded schema
    // but unknown at public-signup time. Stash empty placeholders that the
    // astrologer fills in during /astrologer/onboarding (next chunk).
    const profile = await tx.astrologerProfile.create({
      data: {
        userId: user.id,
        fullName: input.fullName,
        phone: input.phone,
        addressLine1: "",
        city: "",
        state: "",
        postalCode: "",
        country: "IN",
        kycType: "PAN",
        kycNumber: "",
        languages: input.languages,
        specialties: input.specialties,
        yearsExperience: input.yearsExperience,
        qualifications: input.qualifications,
        bio: input.bio,
        status: "PENDING",
        onboardingStep: "PROFILE_SUBMITTED",
      },
      select: { id: true, onboardingStep: true },
    });

    return { user, profile };
  });

  const token = await signUserToken({ userId: result.user.id, role: result.user.role });

  return {
    token,
    user: result.user,
    astrologerProfileId: result.profile.id,
    onboardingStep: result.profile.onboardingStep,
  };
}
