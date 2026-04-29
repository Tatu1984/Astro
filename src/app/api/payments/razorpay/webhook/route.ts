import { NextResponse, type NextRequest } from "next/server";

import { apiError } from "@/backend/utils/api.util";
import { prisma } from "@/backend/database/client";
import { verifyWebhookSignature } from "@/backend/services/payment.service";

type WebhookPayload = {
  event: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; notes?: { bookingId?: string } } };
    refund?: { entity?: { id?: string; payment_id?: string } };
  };
};

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    const sig = req.headers.get("x-razorpay-signature") ?? "";
    if (!verifyWebhookSignature(raw, sig)) {
      return NextResponse.json({ error: "invalid signature" }, { status: 400 });
    }

    const data = JSON.parse(raw) as WebhookPayload;
    const event = data.event;

    if (event === "payment.captured") {
      const orderId = data.payload?.payment?.entity?.order_id;
      const paymentId = data.payload?.payment?.entity?.id;
      if (!orderId || !paymentId) return NextResponse.json({ ok: true });
      const booking = await prisma.booking.findFirst({ where: { razorpayOrderId: orderId } });
      if (!booking) return NextResponse.json({ ok: true });
      if (booking.status === "PENDING_PAYMENT") {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { razorpayPaymentId: paymentId, status: "CONFIRMED" },
        });
      }
    } else if (event === "payment.failed") {
      const orderId = data.payload?.payment?.entity?.order_id;
      if (!orderId) return NextResponse.json({ ok: true });
      const booking = await prisma.booking.findFirst({ where: { razorpayOrderId: orderId } });
      if (booking && booking.status === "PENDING_PAYMENT") {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { status: "CANCELLED", cancelledAt: new Date() },
        });
      }
    } else if (event === "refund.processed") {
      const paymentId = data.payload?.refund?.entity?.payment_id;
      if (!paymentId) return NextResponse.json({ ok: true });
      const booking = await prisma.booking.findFirst({ where: { razorpayPaymentId: paymentId } });
      if (booking && booking.status !== "REFUNDED") {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { status: "REFUNDED" },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
