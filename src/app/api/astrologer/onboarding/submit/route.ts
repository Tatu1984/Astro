import { NextResponse } from "next/server";

import { authErrorResponse, requireRole } from "@/backend/auth/requireRole";
import { prisma } from "@/backend/database/client";
import { KycError, submitKycForReview } from "@/backend/services/kyc.service";

export async function POST() {
  let me;
  try {
    me = await requireRole("ASTROLOGER");
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
  try {
    const updated = await submitKycForReview(me.userId);
    // Best-effort audit row; AuditLog table is owned by the admin-tools
    // branch and may not yet be migrated in every environment.
    try {
      await prisma.auditLog.create({
        data: {
          actorId: me.userId,
          kind: "ASTROLOGER_KYC_SUBMIT",
          resource: "AstrologerProfile",
          resourceId: updated.id,
          payload: { onboardingStep: updated.onboardingStep },
        },
      });
    } catch {
      // table missing — don't break the flow
    }
    return NextResponse.json({ astrologerProfile: updated });
  } catch (err) {
    if (err instanceof KycError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "internal error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
