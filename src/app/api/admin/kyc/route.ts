import { NextResponse } from "next/server";

import { authErrorResponse, requireRole } from "@/backend/auth/requireRole";
import { listPendingKycInbox } from "@/backend/services/kyc.service";

export async function GET() {
  try {
    await requireRole("ADMIN");
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
  const astrologers = await listPendingKycInbox();
  return NextResponse.json({ astrologers });
}
