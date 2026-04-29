-- CreateEnum
CREATE TYPE "ReadingStyle" AS ENUM ('WESTERN', 'VEDIC');

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
CREATE TYPE "ModerationKind" AS ENUM ('HIDE_POST', 'DELETE_POST', 'HIDE_COMMENT', 'DELETE_COMMENT', 'BAN_USER_24H', 'BAN_USER_PERM', 'UNBAN', 'RESTORE');

-- CreateEnum
CREATE TYPE "ModerationTargetType" AS ENUM ('POST', 'COMMENT', 'USER');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('BOOKING_CONFIRMED', 'BOOKING_REMINDER', 'BOOKING_CANCELLED', 'BOOKING_COMPLETED', 'PAYOUT_PROCESSED', 'PAYOUT_REJECTED', 'KYC_APPROVED', 'KYC_REJECTED', 'CHAT_MESSAGE', 'NEW_REVIEW', 'MODERATION_ACTION', 'SYSTEM');

-- AlterTable
ALTER TABLE "AstrologerProfile" ADD COLUMN     "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "onboardingStep" "OnboardingStep" NOT NULL DEFAULT 'SIGNED_UP',
ADD COLUMN     "ratingCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "hiddenAt" TIMESTAMP(3),
ADD COLUMN     "hiddenByUserId" TEXT;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "hiddenAt" TIMESTAMP(3),
ADD COLUMN     "hiddenByUserId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bannedUntil" TIMESTAMP(3),
ADD COLUMN     "notificationPrefs" JSONB,
ADD COLUMN     "readingStyle" "ReadingStyle" DEFAULT 'VEDIC',
ADD COLUMN     "themePreference" TEXT DEFAULT 'system';

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
CREATE TABLE "ConsultTemplate" (
    "id" TEXT NOT NULL,
    "astrologerProfileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientNote" (
    "id" TEXT NOT NULL,
    "astrologerProfileId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookingId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "payload" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "ConsultTemplate_astrologerProfileId_idx" ON "ConsultTemplate"("astrologerProfileId");

-- CreateIndex
CREATE INDEX "ConsultTemplate_isShared_idx" ON "ConsultTemplate"("isShared");

-- CreateIndex
CREATE INDEX "ClientNote_astrologerProfileId_userId_idx" ON "ClientNote"("astrologerProfileId", "userId");

-- CreateIndex
CREATE INDEX "ClientNote_astrologerProfileId_bookingId_idx" ON "ClientNote"("astrologerProfileId", "bookingId");

-- CreateIndex
CREATE INDEX "ClientNote_astrologerProfileId_createdAt_idx" ON "ClientNote"("astrologerProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "FeatureFlag_key_idx" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "AstrologerProfile_onboardingStep_idx" ON "AstrologerProfile"("onboardingStep");

-- CreateIndex
CREATE INDEX "Comment_hiddenAt_idx" ON "Comment"("hiddenAt");

-- CreateIndex
CREATE INDEX "LlmCallLog_createdAt_idx" ON "LlmCallLog"("createdAt");

-- CreateIndex
CREATE INDEX "LlmCallLog_model_createdAt_idx" ON "LlmCallLog"("model", "createdAt");

-- CreateIndex
CREATE INDEX "LlmCallLog_status_createdAt_idx" ON "LlmCallLog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Post_hiddenAt_idx" ON "Post"("hiddenAt");

-- CreateIndex
CREATE INDEX "User_bannedUntil_idx" ON "User"("bannedUntil");

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
ALTER TABLE "Post" ADD CONSTRAINT "Post_hiddenByUserId_fkey" FOREIGN KEY ("hiddenByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_hiddenByUserId_fkey" FOREIGN KEY ("hiddenByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationAction" ADD CONSTRAINT "ModerationAction_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultTemplate" ADD CONSTRAINT "ConsultTemplate_astrologerProfileId_fkey" FOREIGN KEY ("astrologerProfileId") REFERENCES "AstrologerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_astrologerProfileId_fkey" FOREIGN KEY ("astrologerProfileId") REFERENCES "AstrologerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
