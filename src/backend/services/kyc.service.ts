import type { KycDocStatus, KycDocumentKind, Prisma } from "@prisma/client";

import { prisma } from "@/backend/database/client";
import { notify } from "@/backend/services/notification.service";
import {
  deleteObject,
  getSignedUrl,
  uploadObject,
} from "@/backend/services/storage.service";

export class KycError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "KycError";
  }
}

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

// Whitelist explicit; SVG/HTML/JS are deliberately excluded to avoid
// stored-XSS via signed URLs the admin previews in-browser.
export const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "application/pdf",
] as const;

export type AllowedMime = (typeof ALLOWED_MIME)[number];

export const REQUIRED_KINDS: KycDocumentKind[] = [
  "AADHAAR_FRONT",
  "AADHAAR_BACK",
  "PAN",
  "SELFIE_PHOTO",
];

export const OPTIONAL_KINDS: KycDocumentKind[] = [
  "QUALIFICATION_CERT",
  "EXPERIENCE_PROOF",
];

export function isAllowedMime(value: string): value is AllowedMime {
  return (ALLOWED_MIME as readonly string[]).includes(value);
}

async function getProfileByUserId(userId: string): Promise<{ id: string; onboardingStep: string }> {
  const profile = await prisma.astrologerProfile.findUnique({
    where: { userId },
    select: { id: true, onboardingStep: true },
  });
  if (!profile) throw new KycError(404, "astrologer profile not found");
  return profile;
}

interface UploadInput {
  userId: string;
  kind: KycDocumentKind;
  fileName: string;
  contentType: string;
  bytes: Buffer;
}

export async function uploadKycDocument(input: UploadInput) {
  if (input.bytes.byteLength > MAX_FILE_BYTES) {
    throw new KycError(413, `file too large: ${input.bytes.byteLength} > ${MAX_FILE_BYTES}`);
  }
  if (!isAllowedMime(input.contentType)) {
    throw new KycError(415, `unsupported content type: ${input.contentType}`);
  }
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 200);
  if (!safeName) throw new KycError(400, "invalid file name");

  const profile = await getProfileByUserId(input.userId);
  const docId = (await import("node:crypto")).randomUUID();
  const ts = Date.now();
  const key = `kyc/${profile.id}/${docId}-${ts}-${safeName}`;

  await uploadObject({
    key,
    body: input.bytes,
    contentType: input.contentType,
    contentLength: input.bytes.byteLength,
    metadata: {
      kind: input.kind,
      astrologerProfileId: profile.id,
    },
  });

  // Replace any existing PENDING/REJECTED/RESUBMIT_REQUESTED doc of this
  // kind — keeps the inbox tidy. APPROVED docs are immutable.
  const existing = await prisma.kycDocument.findFirst({
    where: { astrologerProfileId: profile.id, kind: input.kind, status: { not: "APPROVED" } },
    select: { id: true, storageKey: true },
  });

  const created = await prisma.kycDocument.create({
    data: {
      id: docId,
      astrologerProfileId: profile.id,
      kind: input.kind,
      storageKey: key,
      fileName: safeName,
      contentType: input.contentType,
      sizeBytes: input.bytes.byteLength,
      status: "PENDING",
    },
    select: kycDocSelect(),
  });

  if (existing) {
    await prisma.kycDocument.delete({ where: { id: existing.id } });
    await deleteObject(existing.storageKey).catch(() => undefined);
  }

  return created;
}

function kycDocSelect() {
  return {
    id: true,
    kind: true,
    fileName: true,
    contentType: true,
    sizeBytes: true,
    status: true,
    reviewerNoteAdmin: true,
    reviewedAt: true,
    createdAt: true,
    storageKey: true,
  } satisfies Prisma.KycDocumentSelect;
}

export async function listOwnKycDocuments(userId: string) {
  const profile = await getProfileByUserId(userId);
  const docs = await prisma.kycDocument.findMany({
    where: { astrologerProfileId: profile.id },
    select: kycDocSelect(),
    orderBy: { createdAt: "desc" },
  });
  // Resolve a fresh signed URL per doc so the UI can preview.
  const withUrls = await Promise.all(
    docs.map(async (d) => ({
      ...d,
      previewUrl: await getSignedUrl(d.storageKey, 900),
    })),
  );
  return { astrologerProfileId: profile.id, onboardingStep: profile.onboardingStep, documents: withUrls };
}

export async function deleteOwnKycDocument(userId: string, docId: string) {
  const profile = await getProfileByUserId(userId);
  const doc = await prisma.kycDocument.findUnique({
    where: { id: docId },
    select: { id: true, astrologerProfileId: true, storageKey: true, status: true },
  });
  if (!doc || doc.astrologerProfileId !== profile.id) {
    throw new KycError(404, "document not found");
  }
  if (doc.status !== "PENDING") {
    throw new KycError(409, `document is already ${doc.status.toLowerCase()}`);
  }
  await prisma.kycDocument.delete({ where: { id: doc.id } });
  await deleteObject(doc.storageKey).catch(() => undefined);
}

/**
 * Astrologer marks themselves as ready for review. Requires every entry
 * in REQUIRED_KINDS to have at least one doc whose status is not
 * REJECTED. Transitions onboardingStep to KYC_SUBMITTED. Idempotent on
 * re-submission.
 */
export async function submitKycForReview(userId: string) {
  const profile = await getProfileByUserId(userId);
  const docs = await prisma.kycDocument.findMany({
    where: { astrologerProfileId: profile.id },
    select: { kind: true, status: true },
  });

  const missing: KycDocumentKind[] = [];
  for (const kind of REQUIRED_KINDS) {
    const ok = docs.some((d) => d.kind === kind && d.status !== "REJECTED");
    if (!ok) missing.push(kind);
  }
  if (missing.length > 0) {
    throw new KycError(400, `missing required documents: ${missing.join(", ")}`);
  }

  const updated = await prisma.astrologerProfile.update({
    where: { id: profile.id },
    data: { onboardingStep: "KYC_SUBMITTED" },
    select: { id: true, onboardingStep: true, status: true },
  });

  return updated;
}

export async function listPendingKycInbox() {
  const profiles = await prisma.astrologerProfile.findMany({
    where: { onboardingStep: { in: ["KYC_SUBMITTED", "UNDER_REVIEW"] } },
    select: {
      id: true,
      fullName: true,
      onboardingStep: true,
      status: true,
      createdAt: true,
      user: { select: { id: true, email: true } },
      kycDocuments: {
        select: {
          id: true,
          kind: true,
          status: true,
          fileName: true,
          contentType: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { updatedAt: "asc" },
  });
  return profiles;
}

export async function getAdminKycDetail(astrologerProfileId: string) {
  const profile = await prisma.astrologerProfile.findUnique({
    where: { id: astrologerProfileId },
    select: {
      id: true,
      fullName: true,
      phone: true,
      onboardingStep: true,
      status: true,
      yearsExperience: true,
      qualifications: true,
      bio: true,
      languages: true,
      specialties: true,
      createdAt: true,
      user: { select: { id: true, email: true } },
      kycDocuments: {
        select: kycDocSelect(),
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!profile) throw new KycError(404, "astrologer profile not found");
  const docsWithUrls = await Promise.all(
    profile.kycDocuments.map(async (d) => ({
      ...d,
      previewUrl: await getSignedUrl(d.storageKey, 900),
    })),
  );
  return { ...profile, kycDocuments: docsWithUrls };
}

interface ReviewDocInput {
  reviewerUserId: string;
  astrologerProfileId: string;
  docId: string;
  status: KycDocStatus;
  note?: string;
}

export async function reviewKycDocument(input: ReviewDocInput) {
  const doc = await prisma.kycDocument.findUnique({
    where: { id: input.docId },
    select: { id: true, astrologerProfileId: true },
  });
  if (!doc || doc.astrologerProfileId !== input.astrologerProfileId) {
    throw new KycError(404, "document not found");
  }
  return prisma.kycDocument.update({
    where: { id: doc.id },
    data: {
      status: input.status,
      reviewerNoteAdmin: input.note ?? null,
      reviewedById: input.reviewerUserId,
      reviewedAt: new Date(),
    },
    select: kycDocSelect(),
  });
}

interface DecisionInput {
  reviewerUserId: string;
  astrologerProfileId: string;
  decision: "APPROVE_ALL" | "REJECT_ALL";
  note?: string;
}

export async function decideAstrologer(input: DecisionInput) {
  const profile = await prisma.astrologerProfile.findUnique({
    where: { id: input.astrologerProfileId },
    select: { id: true, userId: true, onboardingStep: true, status: true },
  });
  if (!profile) throw new KycError(404, "astrologer profile not found");

  if (input.decision === "APPROVE_ALL") {
    const updated = await prisma.astrologerProfile.update({
      where: { id: profile.id },
      data: {
        status: "ACTIVE",
        onboardingStep: "APPROVED",
      },
      select: { id: true, status: true, onboardingStep: true },
    });
    void notify({
      userId: profile.userId,
      kind: "KYC_APPROVED",
      title: "KYC approved",
      body: "Your astrologer profile is approved — you can start accepting bookings.",
      payload: { href: "/astrologer" },
    });
    return updated;
  }
  const updated = await prisma.astrologerProfile.update({
    where: { id: profile.id },
    data: {
      status: "SUSPENDED",
      onboardingStep: "REJECTED",
    },
    select: { id: true, status: true, onboardingStep: true },
  });
  void notify({
    userId: profile.userId,
    kind: "KYC_REJECTED",
    title: "KYC rejected",
    body: input.note ?? "Your KYC submission was not approved. Please re-upload corrected documents.",
    payload: { href: "/astrologer/onboarding" },
  });
  return updated;
}
