◇ injected env (9) from .env.local // tip: ⌘ multiple files { path: ['.env.local', '.env'] }
◇ injected env (0) from .env // tip: ⌘ override existing { override: true }
Loaded Prisma config from prisma.config.ts.

-- CreateEnum
CREATE TYPE "OnboardingStep" AS ENUM ('SIGNED_UP', 'PROFILE_SUBMITTED', 'KYC_SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "KycDocumentKind" AS ENUM ('AADHAAR_FRONT', 'AADHAAR_BACK', 'PAN', 'SELFIE_PHOTO', 'QUALIFICATION_CERT', 'EXPERIENCE_PROOF', 'OTHER');

-- CreateEnum
CREATE TYPE "KycDocStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'RESUBMIT_REQUESTED');

-- AlterTable
ALTER TABLE "AstrologerProfile" ADD COLUMN     "onboardingStep" "OnboardingStep" NOT NULL DEFAULT 'SIGNED_UP';

-- CreateTable
CREATE TABLE "KycDocument" (
    "id" TEXT NOT NULL,
    "astrologerProfileId" TEXT NOT NULL,
    "kind" "KycDocumentKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" "KycDocStatus" NOT NULL DEFAULT 'PENDING',
    "reviewerNoteAdmin" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KycDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KycDocument_astrologerProfileId_idx" ON "KycDocument"("astrologerProfileId");

-- CreateIndex
CREATE INDEX "KycDocument_status_idx" ON "KycDocument"("status");

-- CreateIndex
CREATE INDEX "KycDocument_astrologerProfileId_kind_idx" ON "KycDocument"("astrologerProfileId", "kind");

-- CreateIndex
CREATE INDEX "AstrologerProfile_onboardingStep_idx" ON "AstrologerProfile"("onboardingStep");

-- AddForeignKey
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_astrologerProfileId_fkey" FOREIGN KEY ("astrologerProfileId") REFERENCES "AstrologerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

