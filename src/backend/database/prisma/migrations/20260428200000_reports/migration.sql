-- CreateEnum
CREATE TYPE "ReportKind" AS ENUM ('NATAL_FULL', 'CAREER_WEALTH', 'LOVE_MARRIAGE', 'HEALTH', 'EDUCATION', 'SPIRITUAL');

-- CreateTable
CREATE TABLE IF NOT EXISTS "Report" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT,
    "chartId" TEXT,
    "kind" "ReportKind" NOT NULL,
    "title" TEXT NOT NULL,
    "bodyMarkdown" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "llmProvider" TEXT,
    "llmModel" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsdMicro" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Report_userId_createdAt_idx" ON "Report"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Report_profileId_kind_idx" ON "Report"("profileId", "kind");

ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_chartId_fkey" FOREIGN KEY ("chartId") REFERENCES "Chart"("id") ON DELETE SET NULL ON UPDATE CASCADE;
