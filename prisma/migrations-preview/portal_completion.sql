-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ASTROLOGER', 'ADMIN', 'MODERATOR');

-- CreateEnum
CREATE TYPE "AstroSystem" AS ENUM ('WESTERN', 'VEDIC', 'BOTH');

-- CreateEnum
CREATE TYPE "ReadingStyle" AS ENUM ('WESTERN', 'VEDIC');

-- CreateEnum
CREATE TYPE "KycType" AS ENUM ('PAN', 'AADHAAR', 'PASSPORT', 'VOTER_ID', 'DRIVING_LICENSE');

-- CreateEnum
CREATE TYPE "AstrologerStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "OnboardingStep" AS ENUM ('SIGNED_UP', 'PROFILE_SUBMITTED', 'KYC_SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "KycDocumentKind" AS ENUM ('AADHAAR_FRONT', 'AADHAAR_BACK', 'PAN', 'SELFIE_PHOTO', 'QUALIFICATION_CERT', 'EXPERIENCE_PROOF', 'OTHER');

-- CreateEnum
CREATE TYPE "KycDocStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'RESUBMIT_REQUESTED');

-- CreateEnum
CREATE TYPE "ServiceKind" AS ENUM ('CHAT', 'VOICE', 'VIDEO', 'REPORT');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'REFUNDED');

-- CreateEnum
CREATE TYPE "LedgerKind" AS ENUM ('EARNING', 'PAYOUT', 'ADJUSTMENT', 'REFUND');

-- CreateEnum
CREATE TYPE "LedgerRefType" AS ENUM ('BOOKING', 'PAYOUT', 'MANUAL');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('REQUESTED', 'APPROVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProfileKind" AS ENUM ('SELF', 'PARTNER', 'CHILD', 'FRIEND', 'CELEBRITY', 'OTHER');

-- CreateEnum
CREATE TYPE "HouseSystem" AS ENUM ('PLACIDUS', 'WHOLE_SIGN', 'KOCH', 'EQUAL', 'VEDIC_EQUAL');

-- CreateEnum
CREATE TYPE "ChartKind" AS ENUM ('NATAL', 'TRANSIT', 'PROGRESSED_SECONDARY', 'PROGRESSED_SOLAR_ARC', 'SOLAR_RETURN', 'LUNAR_RETURN', 'ANNUAL_VARSHA', 'COMPOSITE', 'DAVISON', 'HORARY', 'ELECTIONAL', 'DIVISIONAL');

-- CreateEnum
CREATE TYPE "PredictionKind" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'TRANSIT_FORECAST', 'DASHA_VIMSHOTTARI');

-- CreateEnum
CREATE TYPE "CompatibilityKind" AS ENUM ('ROMANTIC', 'FRIENDSHIP', 'BUSINESS', 'FAMILY');

-- CreateEnum
CREATE TYPE "ReportKind" AS ENUM ('NATAL_FULL', 'CAREER_WEALTH', 'LOVE_MARRIAGE', 'HEALTH', 'EDUCATION', 'SPIRITUAL');

-- CreateEnum
CREATE TYPE "PostVisibility" AS ENUM ('PUBLIC', 'ANONYMOUS', 'PRIVATE');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ModerationKind" AS ENUM ('HIDE_POST', 'DELETE_POST', 'HIDE_COMMENT', 'DELETE_COMMENT', 'BAN_USER_24H', 'BAN_USER_PERM', 'UNBAN', 'RESTORE');

-- CreateEnum
CREATE TYPE "ModerationTargetType" AS ENUM ('POST', 'COMMENT', 'USER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "passwordHash" TEXT,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "systemPref" "AstroSystem" NOT NULL DEFAULT 'BOTH',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT,
    "bio" TEXT,
    "referralCode" TEXT NOT NULL,
    "bannedUntil" TIMESTAMP(3),
    "readingStyle" "ReadingStyle" DEFAULT 'VEDIC',
    "themePreference" TEXT DEFAULT 'system',
    "notificationPrefs" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "AstrologerProfile" (
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
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bio" TEXT,
    "bankAccountName" TEXT,
    "bankAccountNumber" TEXT,
    "bankIfsc" TEXT,
    "upiId" TEXT,
    "status" "AstrologerStatus" NOT NULL DEFAULT 'PENDING',
    "onboardingStep" "OnboardingStep" NOT NULL DEFAULT 'SIGNED_UP',
    "onboardedById" TEXT,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AstrologerProfile_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "AstrologerService" (
    "id" TEXT NOT NULL,
    "astrologerProfileId" TEXT NOT NULL,
    "kind" "ServiceKind" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "durationMin" INTEGER NOT NULL,
    "priceInr" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AstrologerService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AstrologerSchedule" (
    "id" TEXT NOT NULL,
    "astrologerProfileId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMinutes" INTEGER NOT NULL,
    "endMinutes" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AstrologerSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleException" (
    "id" TEXT NOT NULL,
    "astrologerProfileId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "isAvailable" BOOLEAN NOT NULL,
    "startMinutes" INTEGER,
    "endMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "astrologerProfileId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "priceInr" INTEGER NOT NULL,
    "platformFeeInr" INTEGER NOT NULL DEFAULT 0,
    "astrologerNetInr" INTEGER NOT NULL DEFAULT 0,
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultSession" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "dailyRoomName" TEXT NOT NULL,
    "dailyRoomUrl" TEXT NOT NULL,
    "dailyTokenUser" TEXT,
    "dailyTokenAstrologer" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "durationActualSec" INTEGER,
    "astrologerNotes" TEXT,
    "recordingUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "astrologerProfileId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletLedger" (
    "id" TEXT NOT NULL,
    "astrologerProfileId" TEXT NOT NULL,
    "kind" "LedgerKind" NOT NULL,
    "amountInr" INTEGER NOT NULL,
    "refType" "LedgerRefType" NOT NULL,
    "refId" TEXT,
    "balanceAfterInr" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "astrologerProfileId" TEXT NOT NULL,
    "amountInr" INTEGER NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'REQUESTED',
    "razorpayPayoutId" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "processedByUserId" TEXT,
    "ledgerEntryId" TEXT,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ProfileKind" NOT NULL,
    "fullName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "birthTime" TIMESTAMP(3),
    "unknownTime" BOOLEAN NOT NULL DEFAULT false,
    "birthPlace" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "timezone" TEXT NOT NULL,
    "gender" TEXT,
    "notes" TEXT,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chart" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT,
    "kind" "ChartKind" NOT NULL,
    "system" "AstroSystem" NOT NULL,
    "houseSystem" "HouseSystem" NOT NULL,
    "divisionalIx" INTEGER,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,
    "inputHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Chart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prediction" (
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

-- CreateTable
CREATE TABLE "Compatibility" (
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

-- CreateTable
CREATE TABLE "Report" (
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

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "visibility" "PostVisibility" NOT NULL DEFAULT 'PUBLIC',
    "hiddenAt" TIMESTAMP(3),
    "hiddenByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "hiddenAt" TIMESTAMP(3),
    "hiddenByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiChatSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT,
    "chartId" TEXT,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "llmProvider" TEXT,
    "llmModel" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsdMicro" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LlmCallLog" (
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

-- CreateTable
CREATE TABLE "ModerationAction" (
    "id" TEXT NOT NULL,
    "kind" "ModerationKind" NOT NULL,
    "targetType" "ModerationTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT,
    "moderatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ModerationAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "kind" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "payload" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rolloutPct" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE INDEX "User_bannedUntil_idx" ON "User"("bannedUntil");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "AstrologerProfile_userId_key" ON "AstrologerProfile"("userId");

-- CreateIndex
CREATE INDEX "AstrologerProfile_status_idx" ON "AstrologerProfile"("status");

-- CreateIndex
CREATE INDEX "AstrologerProfile_onboardingStep_idx" ON "AstrologerProfile"("onboardingStep");

-- CreateIndex
CREATE INDEX "AstrologerProfile_onboardedById_idx" ON "AstrologerProfile"("onboardedById");

-- CreateIndex
CREATE INDEX "KycDocument_astrologerProfileId_idx" ON "KycDocument"("astrologerProfileId");

-- CreateIndex
CREATE INDEX "KycDocument_status_idx" ON "KycDocument"("status");

-- CreateIndex
CREATE INDEX "KycDocument_astrologerProfileId_kind_idx" ON "KycDocument"("astrologerProfileId", "kind");

-- CreateIndex
CREATE INDEX "AstrologerService_astrologerProfileId_idx" ON "AstrologerService"("astrologerProfileId");

-- CreateIndex
CREATE INDEX "AstrologerService_astrologerProfileId_isActive_idx" ON "AstrologerService"("astrologerProfileId", "isActive");

-- CreateIndex
CREATE INDEX "AstrologerService_kind_idx" ON "AstrologerService"("kind");

-- CreateIndex
CREATE INDEX "AstrologerSchedule_astrologerProfileId_idx" ON "AstrologerSchedule"("astrologerProfileId");

-- CreateIndex
CREATE INDEX "AstrologerSchedule_astrologerProfileId_weekday_idx" ON "AstrologerSchedule"("astrologerProfileId", "weekday");

-- CreateIndex
CREATE INDEX "ScheduleException_astrologerProfileId_idx" ON "ScheduleException"("astrologerProfileId");

-- CreateIndex
CREATE INDEX "ScheduleException_astrologerProfileId_date_idx" ON "ScheduleException"("astrologerProfileId", "date");

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

-- CreateIndex
CREATE INDEX "Booking_astrologerProfileId_idx" ON "Booking"("astrologerProfileId");

-- CreateIndex
CREATE INDEX "Booking_serviceId_idx" ON "Booking"("serviceId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_astrologerProfileId_scheduledAt_idx" ON "Booking"("astrologerProfileId", "scheduledAt");

-- CreateIndex
CREATE INDEX "Booking_userId_scheduledAt_idx" ON "Booking"("userId", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultSession_bookingId_key" ON "ConsultSession"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_bookingId_key" ON "Review"("bookingId");

-- CreateIndex
CREATE INDEX "Review_astrologerProfileId_createdAt_idx" ON "Review"("astrologerProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "Review"("userId");

-- CreateIndex
CREATE INDEX "WalletLedger_astrologerProfileId_createdAt_idx" ON "WalletLedger"("astrologerProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "WalletLedger_astrologerProfileId_kind_idx" ON "WalletLedger"("astrologerProfileId", "kind");

-- CreateIndex
CREATE INDEX "Payout_astrologerProfileId_idx" ON "Payout"("astrologerProfileId");

-- CreateIndex
CREATE INDEX "Payout_status_idx" ON "Payout"("status");

-- CreateIndex
CREATE INDEX "Payout_astrologerProfileId_status_idx" ON "Payout"("astrologerProfileId", "status");

-- CreateIndex
CREATE INDEX "Payout_processedByUserId_idx" ON "Payout"("processedByUserId");

-- CreateIndex
CREATE INDEX "Profile_userId_idx" ON "Profile"("userId");

-- CreateIndex
CREATE INDEX "Profile_kind_idx" ON "Profile"("kind");

-- CreateIndex
CREATE INDEX "Chart_userId_idx" ON "Chart"("userId");

-- CreateIndex
CREATE INDEX "Chart_profileId_idx" ON "Chart"("profileId");

-- CreateIndex
CREATE INDEX "Chart_kind_system_idx" ON "Chart"("kind", "system");

-- CreateIndex
CREATE UNIQUE INDEX "Chart_userId_kind_system_houseSystem_inputHash_key" ON "Chart"("userId", "kind", "system", "houseSystem", "inputHash");

-- CreateIndex
CREATE INDEX "Prediction_userId_periodStart_idx" ON "Prediction"("userId", "periodStart");

-- CreateIndex
CREATE INDEX "Prediction_profileId_kind_idx" ON "Prediction"("profileId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "Prediction_userId_profileId_kind_periodStart_key" ON "Prediction"("userId", "profileId", "kind", "periodStart");

-- CreateIndex
CREATE INDEX "Compatibility_userId_createdAt_idx" ON "Compatibility"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Compatibility_userId_kind_profileAId_profileBId_key" ON "Compatibility"("userId", "kind", "profileAId", "profileBId");

-- CreateIndex
CREATE INDEX "Report_userId_createdAt_idx" ON "Report"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Report_profileId_kind_idx" ON "Report"("profileId", "kind");

-- CreateIndex
CREATE INDEX "Post_userId_idx" ON "Post"("userId");

-- CreateIndex
CREATE INDEX "Post_visibility_createdAt_idx" ON "Post"("visibility", "createdAt");

-- CreateIndex
CREATE INDEX "Post_deletedAt_idx" ON "Post"("deletedAt");

-- CreateIndex
CREATE INDEX "Post_hiddenAt_idx" ON "Post"("hiddenAt");

-- CreateIndex
CREATE INDEX "Comment_postId_createdAt_idx" ON "Comment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- CreateIndex
CREATE INDEX "Comment_hiddenAt_idx" ON "Comment"("hiddenAt");

-- CreateIndex
CREATE INDEX "Reaction_postId_idx" ON "Reaction"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_postId_userId_type_key" ON "Reaction"("postId", "userId", "type");

-- CreateIndex
CREATE INDEX "AiChatSession_userId_updatedAt_idx" ON "AiChatSession"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "AiChatMessage_sessionId_createdAt_idx" ON "AiChatMessage"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "LlmCallLog_provider_createdAt_idx" ON "LlmCallLog"("provider", "createdAt");

-- CreateIndex
CREATE INDEX "LlmCallLog_route_createdAt_idx" ON "LlmCallLog"("route", "createdAt");

-- CreateIndex
CREATE INDEX "LlmCallLog_createdAt_idx" ON "LlmCallLog"("createdAt");

-- CreateIndex
CREATE INDEX "LlmCallLog_model_createdAt_idx" ON "LlmCallLog"("model", "createdAt");

-- CreateIndex
CREATE INDEX "LlmCallLog_status_createdAt_idx" ON "LlmCallLog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationAction_targetType_targetId_createdAt_idx" ON "ModerationAction"("targetType", "targetId", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationAction_moderatorId_createdAt_idx" ON "ModerationAction"("moderatorId", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationAction_kind_createdAt_idx" ON "ModerationAction"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_kind_createdAt_idx" ON "AuditLog"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_resource_resourceId_createdAt_idx" ON "AuditLog"("resource", "resourceId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "FeatureFlag_key_idx" ON "FeatureFlag"("key");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AstrologerProfile" ADD CONSTRAINT "AstrologerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AstrologerProfile" ADD CONSTRAINT "AstrologerProfile_onboardedById_fkey" FOREIGN KEY ("onboardedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_astrologerProfileId_fkey" FOREIGN KEY ("astrologerProfileId") REFERENCES "AstrologerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AstrologerService" ADD CONSTRAINT "AstrologerService_astrologerProfileId_fkey" FOREIGN KEY ("astrologerProfileId") REFERENCES "AstrologerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AstrologerSchedule" ADD CONSTRAINT "AstrologerSchedule_astrologerProfileId_fkey" FOREIGN KEY ("astrologerProfileId") REFERENCES "AstrologerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleException" ADD CONSTRAINT "ScheduleException_astrologerProfileId_fkey" FOREIGN KEY ("astrologerProfileId") REFERENCES "AstrologerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_astrologerProfileId_fkey" FOREIGN KEY ("astrologerProfileId") REFERENCES "AstrologerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "AstrologerService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultSession" ADD CONSTRAINT "ConsultSession_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_astrologerProfileId_fkey" FOREIGN KEY ("astrologerProfileId") REFERENCES "AstrologerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletLedger" ADD CONSTRAINT "WalletLedger_astrologerProfileId_fkey" FOREIGN KEY ("astrologerProfileId") REFERENCES "AstrologerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_astrologerProfileId_fkey" FOREIGN KEY ("astrologerProfileId") REFERENCES "AstrologerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_processedByUserId_fkey" FOREIGN KEY ("processedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "WalletLedger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chart" ADD CONSTRAINT "Chart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chart" ADD CONSTRAINT "Chart_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_chartId_fkey" FOREIGN KEY ("chartId") REFERENCES "Chart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compatibility" ADD CONSTRAINT "Compatibility_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compatibility" ADD CONSTRAINT "Compatibility_profileAId_fkey" FOREIGN KEY ("profileAId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compatibility" ADD CONSTRAINT "Compatibility_profileBId_fkey" FOREIGN KEY ("profileBId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_chartId_fkey" FOREIGN KEY ("chartId") REFERENCES "Chart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_hiddenByUserId_fkey" FOREIGN KEY ("hiddenByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_hiddenByUserId_fkey" FOREIGN KEY ("hiddenByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiChatSession" ADD CONSTRAINT "AiChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiChatSession" ADD CONSTRAINT "AiChatSession_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiChatSession" ADD CONSTRAINT "AiChatSession_chartId_fkey" FOREIGN KEY ("chartId") REFERENCES "Chart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiChatMessage" ADD CONSTRAINT "AiChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AiChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
