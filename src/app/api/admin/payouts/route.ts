import { NextResponse, type NextRequest } from "next/server";

import { requireRole } from "@/backend/auth/requireRole";
import { apiError } from "@/backend/utils/api.util";
import { listAllPayouts } from "@/backend/services/payout.service";

export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN");
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? undefined;
    const payouts = await listAllPayouts({ status });
    return NextResponse.json({ payouts });
  } catch (err) {
    return apiError(err);
  }
}
