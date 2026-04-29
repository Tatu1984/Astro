import { NextRequest, NextResponse } from "next/server";

import { authErrorResponse, requireRole } from "@/backend/auth/requireRole";
import { computeCohort } from "@/backend/services/analytics.service";

export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN");
    const url = new URL(req.url);
    const weeks = Number(url.searchParams.get("weeks") ?? 12);
    const rows = await computeCohort(Number.isFinite(weeks) ? Math.max(1, Math.min(weeks, 26)) : 12);
    return NextResponse.json({ rows });
  } catch (err) {
    return authErrorResponse(err) ?? NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
