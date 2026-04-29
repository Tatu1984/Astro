import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse, requireRole } from "@/backend/auth/requireRole";
import { prisma } from "@/backend/database/client";
import { decideAstrologer, KycError } from "@/backend/services/kyc.service";

const BodySchema = z.object({
  decision: z.enum(["APPROVE_ALL", "REJECT_ALL"]),
  note: z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ astrologerProfileId: string }> },
) {
  let me;
  try {
    me = await requireRole("ADMIN");
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
  const { astrologerProfileId } = await params;
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
    const updated = await decideAstrologer({
      reviewerUserId: me.userId,
      astrologerProfileId,
      decision: parsed.data.decision,
      note: parsed.data.note,
    });
    try {
      await prisma.auditLog.create({
        data: {
          actorId: me.userId,
          kind: parsed.data.decision === "APPROVE_ALL" ? "ASTROLOGER_APPROVE" : "ASTROLOGER_REJECT",
          resource: "AstrologerProfile",
          resourceId: updated.id,
          payload: { status: updated.status, onboardingStep: updated.onboardingStep, note: parsed.data.note },
        },
      });
    } catch {
      // audit optional
    }
    return NextResponse.json({ astrologerProfile: updated });
  } catch (err) {
    if (err instanceof KycError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
