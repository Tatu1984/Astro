import type { Prisma } from "@prisma/client";

import { prisma } from "@/backend/database/client";
import { refund as razorpayRefund } from "@/backend/services/payment.service";
import { refundReversal } from "@/backend/services/wallet.service";
import { writeAuditTx } from "@/backend/services/audit.service";

export class RefundError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "RefundError";
  }
}

export interface RefundExistingPayload {
  alreadyRefunded: true;
  bookingId: string;
  refundedAt: string;
  payload: Prisma.JsonValue | null;
}

export async function listRefundableBookings() {
  return prisma.booking.findMany({
    where: {
      status: { in: ["COMPLETED", "CONFIRMED", "IN_PROGRESS", "REFUNDED"] },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      user: { select: { id: true, name: true, email: true } },
      astrologerProfile: { select: { id: true, fullName: true, userId: true } },
      service: { select: { id: true, title: true, kind: true } },
    },
  });
}

export async function getExistingRefundLog(bookingId: string) {
  return prisma.auditLog.findFirst({
    where: { kind: "BOOKING_REFUND", resource: "booking", resourceId: bookingId },
    orderBy: { createdAt: "desc" },
  });
}

export interface RefundInput {
  bookingId: string;
  actorUserId: string;
  amountInr?: number;
  reason: string;
}

export async function refundBooking(input: RefundInput) {
  const existing = await getExistingRefundLog(input.bookingId);
  if (existing) {
    return {
      alreadyRefunded: true as const,
      bookingId: input.bookingId,
      refundedAt: existing.createdAt.toISOString(),
      payload: existing.payload as Prisma.JsonValue | null,
    } satisfies RefundExistingPayload;
  }

  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    select: {
      id: true,
      userId: true,
      astrologerProfileId: true,
      priceInr: true,
      astrologerNetInr: true,
      razorpayPaymentId: true,
      status: true,
    },
  });
  if (!booking) throw new RefundError(404, "booking not found");
  if (booking.status === "REFUNDED") throw new RefundError(409, "booking already refunded");
  if (!booking.razorpayPaymentId) {
    throw new RefundError(400, "no payment recorded — nothing to refund");
  }

  const amountInr = input.amountInr ?? booking.priceInr;
  if (amountInr <= 0) throw new RefundError(400, "refund amount must be > 0");
  if (amountInr > booking.priceInr) {
    throw new RefundError(400, `refund amount ${amountInr} exceeds booking price ${booking.priceInr}`);
  }
  if (!input.reason || !input.reason.trim()) throw new RefundError(400, "reason required");

  // Step 1: external refund (or stub) — outside transaction so we don't hold
  // a DB connection across the network call.
  const rzpResult = await razorpayRefund(booking.razorpayPaymentId, amountInr);

  // Step 2: ledger reversal + booking status + audit, atomically.
  const result = await prisma.$transaction(async (tx) => {
    // Reverse the astrologer's earning proportionally. If full refund, reverse
    // the full astrologerNetInr; if partial, prorate.
    const reversalNet = Math.round((amountInr / booking.priceInr) * booking.astrologerNetInr);
    if (reversalNet > 0) {
      await tx.walletLedger.create({
        data: {
          astrologerProfileId: booking.astrologerProfileId,
          kind: "REFUND",
          amountInr: -reversalNet,
          refType: "BOOKING",
          refId: booking.id,
          balanceAfterInr: await computeNextBalance(tx, booking.astrologerProfileId, -reversalNet),
          description: `refund reversal for booking ${booking.id} (${input.reason})`,
        },
      });
    }

    // If full refund, mark REFUNDED.
    const isFullRefund = amountInr === booking.priceInr;
    const updated = await tx.booking.update({
      where: { id: booking.id },
      data: { status: isFullRefund ? "REFUNDED" : booking.status },
    });

    await writeAuditTx(tx, {
      kind: "BOOKING_REFUND",
      actorUserId: input.actorUserId,
      resourceType: "booking",
      resourceId: booking.id,
      payload: {
        amountInr,
        priceInr: booking.priceInr,
        reason: input.reason,
        razorpayPaymentId: booking.razorpayPaymentId,
        razorpayRefundId: rzpResult.id,
        stub: rzpResult.stub,
        astrologerReversalInr: reversalNet,
        isFullRefund,
      },
    });

    return { ok: true, booking: updated, refundId: rzpResult.id, amountInr };
  });

  return result;
}

async function computeNextBalance(
  tx: Prisma.TransactionClient,
  astrologerProfileId: string,
  delta: number,
): Promise<number> {
  const last = await tx.walletLedger.findFirst({
    where: { astrologerProfileId },
    orderBy: { createdAt: "desc" },
    select: { balanceAfterInr: true },
  });
  return (last?.balanceAfterInr ?? 0) + delta;
}

// Re-export to make the wallet refundReversal helper visible for callers that
// want a direct ledger reversal without the full booking flow.
export { refundReversal };
