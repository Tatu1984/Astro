import { NextResponse } from "next/server";

import { requireRole } from "@/backend/auth/requireRole";
import { apiError } from "@/backend/utils/api.util";
import { getExistingRefundLog, listRefundableBookings } from "@/backend/services/refund.service";

export async function GET() {
  try {
    await requireRole("ADMIN");
    const bookings = await listRefundableBookings();
    const enriched = await Promise.all(
      bookings.map(async (b) => {
        const log = await getExistingRefundLog(b.id);
        const payload = log?.payload as { amountInr?: number; reason?: string; razorpayRefundId?: string } | null | undefined;
        return {
          id: b.id,
          status: b.status,
          priceInr: b.priceInr,
          razorpayPaymentId: b.razorpayPaymentId,
          scheduledAt: b.scheduledAt,
          updatedAt: b.updatedAt,
          user: b.user,
          astrologerProfile: { id: b.astrologerProfile.id, fullName: b.astrologerProfile.fullName },
          service: b.service,
          refunded: log
            ? {
                refundedAt: log.createdAt,
                amountInr: payload?.amountInr ?? null,
                reason: payload?.reason ?? null,
                razorpayRefundId: payload?.razorpayRefundId ?? null,
              }
            : null,
        };
      }),
    );
    return NextResponse.json({ bookings: enriched });
  } catch (err) {
    return apiError(err);
  }
}
