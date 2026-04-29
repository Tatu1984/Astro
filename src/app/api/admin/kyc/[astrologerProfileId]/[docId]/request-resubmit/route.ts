import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse, requireRole } from "@/backend/auth/requireRole";
import { prisma } from "@/backend/database/client";
import { KycError, reviewKycDocument } from "@/backend/services/kyc.service";

const BodySchema = z.object({
  reason: z.string().min(1).max(500),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ astrologerProfileId: string; docId: string }> },
) {
  let me;
  try {
    me = await requireRole("ADMIN");
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
  const { astrologerProfileId, docId } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation failed", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }
  try {
    const doc = await reviewKycDocument({
      reviewerUserId: me.userId,
      astrologerProfileId,
      docId,
      status: "RESUBMIT_REQUESTED",
      note: parsed.data.reason,
    });
    try {
      await prisma.auditLog.create({
        data: {
          actorId: me.userId,
          kind: "KYC_DOC_RESUBMIT",
          resource: "KycDocument",
          resourceId: doc.id,
          payload: { astrologerProfileId, kind: doc.kind, reason: parsed.data.reason },
        },
      });
    } catch {
      // audit table optional
    }
    return NextResponse.json({ document: doc });
  } catch (err) {
    if (err instanceof KycError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
