import { NextRequest, NextResponse } from "next/server";

import { authErrorResponse, requireRole } from "@/backend/auth/requireRole";
import { prisma } from "@/backend/database/client";
import { KycError, reviewKycDocument } from "@/backend/services/kyc.service";

export async function POST(
  _req: NextRequest,
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
  try {
    const doc = await reviewKycDocument({
      reviewerUserId: me.userId,
      astrologerProfileId,
      docId,
      status: "APPROVED",
    });
    try {
      await prisma.auditLog.create({
        data: {
          actorId: me.userId,
          kind: "KYC_DOC_APPROVE",
          resource: "KycDocument",
          resourceId: doc.id,
          payload: { astrologerProfileId, kind: doc.kind },
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
