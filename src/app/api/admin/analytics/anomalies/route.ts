import { NextResponse } from "next/server";

import { authErrorResponse, requireRole } from "@/backend/auth/requireRole";
import { computeAnomalies } from "@/backend/services/analytics.service";

export async function GET() {
  try {
    await requireRole("ADMIN");
    const data = await computeAnomalies();
    return NextResponse.json(data);
  } catch (err) {
    return authErrorResponse(err) ?? NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
