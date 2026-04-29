import { NextResponse, type NextRequest } from "next/server";

import { requireAuth } from "@/backend/auth/requireRole";
import { apiError } from "@/backend/utils/api.util";
import { prisma } from "@/backend/database/client";
import { cancelBooking } from "@/backend/services/booking.service";
import { refund as razorpayRefund } from "@/backend/services/payment.service";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireAuth();
    const { id } = await ctx.params;

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) return NextResponse.json({ error: "not found" }, { status: 404 });

    const cancelled = await cancelBooking(id, me.userId, me.role === "ADMIN");

    if (booking.status === "CONFIRMED" && booking.razorpayPaymentId) {
      try {
        const r = await razorpayRefund(booking.razorpayPaymentId);
        await prisma.booking.update({ where: { id }, data: { status: "REFUNDED" } });
        return NextResponse.json({ booking: { ...cancelled, status: "REFUNDED" }, refund: r });
      } catch (err) {
        console.error("[consult.cancel] refund failed", err);
        return NextResponse.json({ booking: cancelled, refundError: "refund failed; admin will retry" });
      }
    }
    return NextResponse.json({ booking: cancelled });
  } catch (err) {
    return apiError(err);
  }
}
