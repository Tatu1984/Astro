import { NextResponse, type NextRequest } from "next/server";

import { requireAuth } from "@/backend/auth/requireRole";
import { apiError } from "@/backend/utils/api.util";
import { getBooking } from "@/backend/services/booking.service";
import { prisma } from "@/backend/database/client";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireAuth();
    const { id } = await ctx.params;
    const booking = await getBooking(id);
    if (!booking) return NextResponse.json({ error: "not found" }, { status: 404 });

    let allowed = booking.userId === me.userId;
    if (!allowed) {
      const astro = await prisma.astrologerProfile.findUnique({
        where: { id: booking.astrologerProfileId },
        select: { userId: true },
      });
      if (astro?.userId === me.userId) allowed = true;
    }
    if (!allowed && me.role !== "ADMIN") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    return NextResponse.json({ booking });
  } catch (err) {
    return apiError(err);
  }
}
