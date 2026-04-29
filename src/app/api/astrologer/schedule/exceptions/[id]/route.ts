import { NextResponse, type NextRequest } from "next/server";

import { requireRole } from "@/backend/auth/requireRole";
import { apiError } from "@/backend/utils/api.util";
import {
  deleteScheduleException,
  requireOwnAstrologerProfile,
} from "@/backend/services/marketplace.service";

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireRole("ASTROLOGER", "ADMIN");
    const profile = await requireOwnAstrologerProfile(me.userId);
    const { id } = await ctx.params;
    await deleteScheduleException(profile.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
