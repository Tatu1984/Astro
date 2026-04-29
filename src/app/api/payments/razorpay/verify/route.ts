import { NextResponse, type NextRequest } from "next/server";

import { requireAuth } from "@/backend/auth/requireRole";
import { apiError, readJson, validationError } from "@/backend/utils/api.util";
import { prisma } from "@/backend/database/client";
import { verifyPaymentSignature } from "@/backend/services/payment.service";
import { transitionStatus } from "@/backend/services/booking.service";
import { RazorpayVerifySchema } from "@/backend/validators/marketplace.validator";

export async function POST(req: NextRequest) {
  try {
    const me = await requireAuth();
    const body = await readJson(req);
    const parsed = RazorpayVerifySchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const booking = await prisma.booking.findUnique({ where: { id: parsed.data.bookingId } });
    if (!booking) return NextResponse.json({ error: "booking not found" }, { status: 404 });
    if (booking.userId !== me.userId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (booking.razorpayOrderId !== parsed.data.razorpayOrderId) {
      return NextResponse.json({ error: "order id mismatch" }, { status: 400 });
    }

    const ok = verifyPaymentSignature({
      orderId: parsed.data.razorpayOrderId,
      paymentId: parsed.data.razorpayPaymentId,
      signature: parsed.data.razorpaySignature,
    });
    if (!ok) return NextResponse.json({ error: "invalid signature" }, { status: 400 });

    await prisma.booking.update({
      where: { id: booking.id },
      data: { razorpayPaymentId: parsed.data.razorpayPaymentId },
    });
    const updated = await transitionStatus(booking.id, "CONFIRMED");
    return NextResponse.json({ booking: updated });
  } catch (err) {
    return apiError(err);
  }
}
