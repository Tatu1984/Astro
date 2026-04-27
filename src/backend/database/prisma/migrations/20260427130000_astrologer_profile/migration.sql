-- CreateEnum
CREATE TYPE "KycType" AS ENUM ('PAN', 'AADHAAR', 'PASSPORT', 'VOTER_ID', 'DRIVING_LICENSE');

-- CreateEnum
CREATE TYPE "AstrologerStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- CreateTable
CREATE TABLE IF NOT EXISTS "AstrologerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "alternatePhone" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "kycType" "KycType" NOT NULL,
    "kycNumber" TEXT NOT NULL,
    "kycVerifiedAt" TIMESTAMP(3),
    "kycDocUrl" TEXT,
    "qualifications" TEXT,
    "yearsExperience" INTEGER,
    "specialties" TEXT[],
    "bio" TEXT,
    "bankAccountName" TEXT,
    "bankAccountNumber" TEXT,
    "bankIfsc" TEXT,
    "upiId" TEXT,
    "status" "AstrologerStatus" NOT NULL DEFAULT 'PENDING',
    "onboardedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AstrologerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AstrologerProfile_userId_key" ON "AstrologerProfile"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AstrologerProfile_status_idx" ON "AstrologerProfile"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AstrologerProfile_onboardedById_idx" ON "AstrologerProfile"("onboardedById");

-- AddForeignKey
ALTER TABLE "AstrologerProfile" ADD CONSTRAINT "AstrologerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AstrologerProfile" ADD CONSTRAINT "AstrologerProfile_onboardedById_fkey" FOREIGN KEY ("onboardedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
