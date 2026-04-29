import { NextRequest, NextResponse } from "next/server";

import { authErrorResponse, requireRole } from "@/backend/auth/requireRole";
import { computeFunnel } from "@/backend/services/analytics.service";

export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN");
    const url = new URL(req.url);
    const days = Number(url.searchParams.get("days") ?? 30);
    const data = await computeFunnel(Number.isFinite(days) ? Math.max(1, Math.min(days, 365)) : 30);
    return NextResponse.json(data);
  } catch (err) {
    return authErrorResponse(err) ?? NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
