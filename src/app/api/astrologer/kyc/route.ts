import { NextResponse } from "next/server";

import { authErrorResponse, requireRole } from "@/backend/auth/requireRole";
import { KycError, listOwnKycDocuments } from "@/backend/services/kyc.service";

export async function GET() {
  let me;
  try {
    me = await requireRole("ASTROLOGER");
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
  try {
    const data = await listOwnKycDocuments(me.userId);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof KycError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
