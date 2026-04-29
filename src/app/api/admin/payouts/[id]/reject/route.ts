import { NextResponse, type NextRequest } from "next/server";

import { requireRole } from "@/backend/auth/requireRole";
import { apiError } from "@/backend/utils/api.util";
import { rejectPayout } from "@/backend/services/payout.service";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireRole("ADMIN");
    const { id } = await ctx.params;
    const payout = await rejectPayout(id, me.userId);
    return NextResponse.json({ payout });
  } catch (err) {
    return apiError(err);
  }
}
