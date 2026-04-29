import { NextResponse, type NextRequest } from "next/server";

import { requireRole } from "@/backend/auth/requireRole";
import { apiError, readJson, validationError } from "@/backend/utils/api.util";
import { listPayoutsForAstrologer, requestPayout } from "@/backend/services/payout.service";
import { requireOwnAstrologerProfile } from "@/backend/services/marketplace.service";
import { PayoutRequestSchema } from "@/backend/validators/marketplace.validator";

export async function GET() {
  try {
    const me = await requireRole("ASTROLOGER", "ADMIN");
    const profile = await requireOwnAstrologerProfile(me.userId);
    const payouts = await listPayoutsForAstrologer(profile.id);
    return NextResponse.json({ payouts });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await requireRole("ASTROLOGER", "ADMIN");
    const profile = await requireOwnAstrologerProfile(me.userId);
    const body = await readJson(req);
    const parsed = PayoutRequestSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const payout = await requestPayout(profile.id, parsed.data.amountInr);
    return NextResponse.json({ payout }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
