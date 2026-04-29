import { NextResponse, type NextRequest } from "next/server";

import { requireRole } from "@/backend/auth/requireRole";
import { apiError } from "@/backend/utils/api.util";
import { listAllBookings } from "@/backend/services/booking.service";
import type { BookingStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN");
    const url = new URL(req.url);
    const status = url.searchParams.get("status") as BookingStatus | null;
    const fromStr = url.searchParams.get("from");
    const toStr = url.searchParams.get("to");
    const bookings = await listAllBookings({
      status: status ?? undefined,
      from: fromStr ? new Date(fromStr) : undefined,
      to: toStr ? new Date(toStr) : undefined,
    });
    return NextResponse.json({ bookings });
  } catch (err) {
    return apiError(err);
  }
}
