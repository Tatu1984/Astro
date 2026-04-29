import { NextResponse, type NextRequest } from "next/server";

import { requireAuth } from "@/backend/auth/requireRole";
import { apiError, readJson, validationError } from "@/backend/utils/api.util";
import { prisma } from "@/backend/database/client";
import { createBooking, listBookingsForUser } from "@/backend/services/booking.service";
import { createOrder } from "@/backend/services/payment.service";
import { CreateBookingSchema } from "@/backend/validators/marketplace.validator";

export async function GET() {
  try {
    const me = await requireAuth();
    const bookings = await listBookingsForUser(me.userId);
    return NextResponse.json({ bookings });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await requireAuth();
    const body = await readJson(req);
    const parsed = CreateBookingSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const booking = await createBooking({
      userId: me.userId,
      astrologerProfileId: parsed.data.astrologerProfileId,
      serviceId: parsed.data.serviceId,
      scheduledAt: new Date(parsed.data.scheduledAt),
    });

    const order = await createOrder({ amountInr: booking.priceInr, bookingId: booking.id });

    await prisma.booking.update({
      where: { id: booking.id },
      data: { razorpayOrderId: order.orderId },
    });

    return NextResponse.json(
      {
        booking: { ...booking, razorpayOrderId: order.orderId },
        checkout: {
          orderId: order.orderId,
          keyId: order.keyId,
          amountPaise: order.amountPaise,
          currency: order.currency,
          stub: order.stub,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    return apiError(err);
  }
}
