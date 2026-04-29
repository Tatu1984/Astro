import { NextResponse, type NextRequest } from "next/server";

import { requireRole } from "@/backend/auth/requireRole";
import { apiError } from "@/backend/utils/api.util";
import { listReviewsForAstrologer } from "@/backend/services/review.service";
import { requireOwnAstrologerProfile } from "@/backend/services/marketplace.service";

export async function GET(req: NextRequest) {
  try {
    const me = await requireRole("ASTROLOGER", "ADMIN");
    const profile = await requireOwnAstrologerProfile(me.userId);
    const url = new URL(req.url);
    const take = Math.min(50, Number(url.searchParams.get("take") ?? 20) || 20);
    const skip = Math.max(0, Number(url.searchParams.get("skip") ?? 0) || 0);
    const reviews = await listReviewsForAstrologer(profile.id, { take, skip });
    return NextResponse.json({ reviews });
  } catch (err) {
    return apiError(err);
  }
}
