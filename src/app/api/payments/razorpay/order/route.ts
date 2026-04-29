import { NextResponse, type NextRequest } from "next/server";

import { requireAuth } from "@/backend/auth/requireRole";
import { apiError, readJson, validationError } from "@/backend/utils/api.util";
import { prisma } from "@/backend/database/client";
import { createOrder } from "@/backend/services/payment.service";
import { RazorpayOrderRequestSchema } from "@/backend/validators/marketplace.validator";

export async function POST(req: NextRequest) {
  try {
    const me = await requireAuth();
    const body = await readJson(req);
    const parsed = RazorpayOrderRequestSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const booking = await prisma.booking.findUnique({ where: { id: parsed.data.bookingId } });
    if (!booking) return NextResponse.json({ error: "booking not found" }, { status: 404 });
    if (booking.userId !== me.userId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (booking.status !== "PENDING_PAYMENT") {
      return NextResponse.json({ error: `booking is ${booking.status}` }, { status: 400 });
    }

    const order = await createOrder({ amountInr: booking.priceInr, bookingId: booking.id });
    await prisma.booking.update({
      where: { id: booking.id },
      data: { razorpayOrderId: order.orderId },
    });
    return NextResponse.json({
      orderId: order.orderId,
      keyId: order.keyId,
      amountPaise: order.amountPaise,
      currency: order.currency,
      stub: order.stub,
    });
  } catch (err) {
    return apiError(err);
  }
}
