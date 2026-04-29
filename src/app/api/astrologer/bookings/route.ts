import { NextResponse, type NextRequest } from "next/server";

import { requireRole } from "@/backend/auth/requireRole";
import { apiError } from "@/backend/utils/api.util";
import { listBookingsForAstrologer } from "@/backend/services/booking.service";
import { requireOwnAstrologerProfile } from "@/backend/services/marketplace.service";
import type { BookingStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const me = await requireRole("ASTROLOGER", "ADMIN");
    const profile = await requireOwnAstrologerProfile(me.userId);
    const url = new URL(req.url);
    const status = url.searchParams.get("status") as BookingStatus | null;
    const fromStr = url.searchParams.get("from");
    const toStr = url.searchParams.get("to");
    const bookings = await listBookingsForAstrologer(profile.id, {
      status: status ?? undefined,
      from: fromStr ? new Date(fromStr) : undefined,
      to: toStr ? new Date(toStr) : undefined,
    });
    return NextResponse.json({ bookings });
  } catch (err) {
    return apiError(err);
  }
}
