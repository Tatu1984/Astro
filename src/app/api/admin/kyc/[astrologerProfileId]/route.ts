import { NextResponse } from "next/server";

import { authErrorResponse, requireRole } from "@/backend/auth/requireRole";
import { getAdminKycDetail, KycError } from "@/backend/services/kyc.service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ astrologerProfileId: string }> },
) {
  try {
    await requireRole("ADMIN");
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
  const { astrologerProfileId } = await params;
  try {
    const detail = await getAdminKycDetail(astrologerProfileId);
    return NextResponse.json(detail);
  } catch (err) {
    if (err instanceof KycError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
