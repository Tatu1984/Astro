-- CreateEnum
CREATE TYPE "CompatibilityKind" AS ENUM ('ROMANTIC', 'FRIENDSHIP', 'BUSINESS', 'FAMILY');

-- CreateTable
CREATE TABLE IF NOT EXISTS "Compatibility" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "CompatibilityKind" NOT NULL,
    "profileAId" TEXT NOT NULL,
    "profileBId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "details" JSONB NOT NULL,
    "text" TEXT,
    "llmProvider" TEXT,
    "llmModel" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsdMicro" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Compatibility_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Compatibility_userId_kind_profileAId_profileBId_key" ON "Compatibility"("userId", "kind", "profileAId", "profileBId");
CREATE INDEX IF NOT EXISTS "Compatibility_userId_createdAt_idx" ON "Compatibility"("userId", "createdAt");

ALTER TABLE "Compatibility" ADD CONSTRAINT "Compatibility_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Compatibility" ADD CONSTRAINT "Compatibility_profileAId_fkey" FOREIGN KEY ("profileAId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Compatibility" ADD CONSTRAINT "Compatibility_profileBId_fkey" FOREIGN KEY ("profileBId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
