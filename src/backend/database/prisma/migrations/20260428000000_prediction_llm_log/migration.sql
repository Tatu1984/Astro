-- CreateEnum
CREATE TYPE "PredictionKind" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'TRANSIT_FORECAST', 'DASHA_VIMSHOTTARI');

-- CreateTable
CREATE TABLE IF NOT EXISTS "Prediction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT,
    "chartId" TEXT,
    "kind" "PredictionKind" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "facts" JSONB NOT NULL,
    "payload" JSONB NOT NULL,
    "text" TEXT NOT NULL,
    "llmProvider" TEXT NOT NULL,
    "llmModel" TEXT NOT NULL,
    "promptHash" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsdMicro" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Prediction_userId_periodStart_idx" ON "Prediction"("userId", "periodStart");
CREATE INDEX IF NOT EXISTS "Prediction_profileId_kind_idx" ON "Prediction"("profileId", "kind");
CREATE UNIQUE INDEX IF NOT EXISTS "Prediction_userId_profileId_kind_periodStart_key" ON "Prediction"("userId", "profileId", "kind", "periodStart");

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_chartId_fkey" FOREIGN KEY ("chartId") REFERENCES "Chart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE IF NOT EXISTS "LlmCallLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "route" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptHash" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsdMicro" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LlmCallLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LlmCallLog_provider_createdAt_idx" ON "LlmCallLog"("provider", "createdAt");
CREATE INDEX IF NOT EXISTS "LlmCallLog_route_createdAt_idx" ON "LlmCallLog"("route", "createdAt");
