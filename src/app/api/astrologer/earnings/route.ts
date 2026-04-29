import { NextResponse } from "next/server";

import { requireRole } from "@/backend/auth/requireRole";
import { apiError } from "@/backend/utils/api.util";
import { earningsSummary, ledgerForAstrologer } from "@/backend/services/wallet.service";
import { requireOwnAstrologerProfile } from "@/backend/services/marketplace.service";

export async function GET() {
  try {
    const me = await requireRole("ASTROLOGER", "ADMIN");
    const profile = await requireOwnAstrologerProfile(me.userId);
    const [summary, ledger] = await Promise.all([
      earningsSummary(profile.id),
      ledgerForAstrologer(profile.id, 100),
    ]);
    return NextResponse.json({ ...summary, ledger });
  } catch (err) {
    return apiError(err);
  }
}
