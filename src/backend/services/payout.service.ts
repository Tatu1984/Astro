import { prisma } from "@/backend/database/client";
import * as walletService from "@/backend/services/wallet.service";

export class PayoutError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "PayoutError";
  }
}

export async function requestPayout(astrologerProfileId: string, amountInr: number) {
  if (amountInr <= 0) throw new PayoutError(400, "amount must be > 0");

  const balance = await walletService.currentBalance(astrologerProfileId);
  const pending = await prisma.payout.aggregate({
    where: { astrologerProfileId, status: { in: ["REQUESTED", "APPROVED", "PROCESSING"] } },
    _sum: { amountInr: true },
  });
  const reserved = pending._sum.amountInr ?? 0;
  if (amountInr > balance - reserved) {
    throw new PayoutError(400, `insufficient balance (available=${balance - reserved})`);
  }

  return prisma.payout.create({
    data: {
      astrologerProfileId,
      amountInr,
      status: "REQUESTED",
    },
  });
}

export async function listPayoutsForAstrologer(astrologerProfileId: string) {
  return prisma.payout.findMany({
    where: { astrologerProfileId },
    orderBy: { requestedAt: "desc" },
  });
}

export async function listAllPayouts(filter: { status?: string } = {}) {
  return prisma.payout.findMany({
    where: filter.status ? { status: filter.status as never } : undefined,
    orderBy: { requestedAt: "desc" },
    include: {
      astrologerProfile: {
        select: {
          id: true,
          fullName: true,
          bankAccountName: true,
          upiId: true,
          user: { select: { email: true, name: true } },
        },
      },
    },
  });
}

export async function approvePayout(payoutId: string, adminUserId: string) {
  return prisma.$transaction(async (tx) => {
    const payout = await tx.payout.findUnique({ where: { id: payoutId } });
    if (!payout) throw new PayoutError(404, "payout not found");
    if (payout.status !== "REQUESTED") {
      throw new PayoutError(400, `cannot approve from status ${payout.status}`);
    }

    const ledgerEntry = await walletService.debitPayout(
      payout.astrologerProfileId,
      payout.id,
      payout.amountInr,
      tx,
    );

    return tx.payout.update({
      where: { id: payoutId },
      data: {
        status: "PROCESSING",
        processedByUserId: adminUserId,
        ledgerEntryId: ledgerEntry.id,
      },
    });
  });
}

export async function markPayoutCompleted(payoutId: string, razorpayPayoutId?: string) {
  const payout = await prisma.payout.findUnique({ where: { id: payoutId } });
  if (!payout) throw new PayoutError(404, "payout not found");
  if (payout.status !== "PROCESSING" && payout.status !== "APPROVED") {
    throw new PayoutError(400, `cannot mark complete from ${payout.status}`);
  }
  return prisma.payout.update({
    where: { id: payoutId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      razorpayPayoutId,
    },
  });
}

export async function rejectPayout(payoutId: string, adminUserId: string) {
  const payout = await prisma.payout.findUnique({ where: { id: payoutId } });
  if (!payout) throw new PayoutError(404, "payout not found");
  if (payout.status !== "REQUESTED") {
    throw new PayoutError(400, `cannot reject from status ${payout.status}`);
  }
  return prisma.payout.update({
    where: { id: payoutId },
    data: {
      status: "REJECTED",
      processedByUserId: adminUserId,
    },
  });
}
