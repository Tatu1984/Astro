import type { LedgerKind, LedgerRefType, Prisma } from "@prisma/client";

import { prisma } from "@/backend/database/client";

export class WalletError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "WalletError";
  }
}

async function getCurrentBalance(
  tx: Prisma.TransactionClient,
  astrologerProfileId: string,
): Promise<number> {
  const last = await tx.walletLedger.findFirst({
    where: { astrologerProfileId },
    orderBy: { createdAt: "desc" },
    select: { balanceAfterInr: true },
  });
  return last?.balanceAfterInr ?? 0;
}

type LedgerInsert = {
  astrologerProfileId: string;
  kind: LedgerKind;
  amountInr: number; // signed
  refType: LedgerRefType;
  refId?: string;
  description?: string;
};

async function appendLedger(tx: Prisma.TransactionClient, entry: LedgerInsert) {
  const balance = await getCurrentBalance(tx, entry.astrologerProfileId);
  const next = balance + entry.amountInr;
  if (next < 0) {
    throw new WalletError(400, `wallet balance would go negative (current=${balance}, delta=${entry.amountInr})`);
  }
  return tx.walletLedger.create({
    data: {
      astrologerProfileId: entry.astrologerProfileId,
      kind: entry.kind,
      amountInr: entry.amountInr,
      refType: entry.refType,
      refId: entry.refId,
      balanceAfterInr: next,
      description: entry.description,
    },
  });
}

export async function creditEarning(
  astrologerProfileId: string,
  bookingId: string,
  amountInr: number,
  tx?: Prisma.TransactionClient,
) {
  if (amountInr <= 0) throw new WalletError(400, "earning credit must be positive");
  const exec = (txc: Prisma.TransactionClient) =>
    appendLedger(txc, {
      astrologerProfileId,
      kind: "EARNING",
      amountInr,
      refType: "BOOKING",
      refId: bookingId,
      description: `earning for booking ${bookingId}`,
    });
  return tx ? exec(tx) : prisma.$transaction(exec);
}

export async function debitPayout(
  astrologerProfileId: string,
  payoutId: string,
  amountInr: number,
  tx?: Prisma.TransactionClient,
) {
  if (amountInr <= 0) throw new WalletError(400, "payout debit must be positive");
  const exec = (txc: Prisma.TransactionClient) =>
    appendLedger(txc, {
      astrologerProfileId,
      kind: "PAYOUT",
      amountInr: -amountInr,
      refType: "PAYOUT",
      refId: payoutId,
      description: `payout ${payoutId}`,
    });
  return tx ? exec(tx) : prisma.$transaction(exec);
}

export async function refundReversal(
  astrologerProfileId: string,
  bookingId: string,
  amountInr: number,
  tx?: Prisma.TransactionClient,
) {
  const exec = (txc: Prisma.TransactionClient) =>
    appendLedger(txc, {
      astrologerProfileId,
      kind: "REFUND",
      amountInr: -amountInr,
      refType: "BOOKING",
      refId: bookingId,
      description: `refund reversal for booking ${bookingId}`,
    });
  return tx ? exec(tx) : prisma.$transaction(exec);
}

export async function adjustBalance(
  astrologerProfileId: string,
  amountInr: number,
  description: string,
) {
  return prisma.$transaction((tx) =>
    appendLedger(tx, {
      astrologerProfileId,
      kind: "ADJUSTMENT",
      amountInr,
      refType: "MANUAL",
      description,
    }),
  );
}

export async function currentBalance(astrologerProfileId: string): Promise<number> {
  const last = await prisma.walletLedger.findFirst({
    where: { astrologerProfileId },
    orderBy: { createdAt: "desc" },
    select: { balanceAfterInr: true },
  });
  return last?.balanceAfterInr ?? 0;
}

export async function ledgerForAstrologer(astrologerProfileId: string, limit = 100) {
  return prisma.walletLedger.findMany({
    where: { astrologerProfileId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function earningsSummary(astrologerProfileId: string) {
  const [totalEarned, totalPayout, pendingRequested, balance] = await Promise.all([
    prisma.walletLedger.aggregate({
      where: { astrologerProfileId, kind: "EARNING" },
      _sum: { amountInr: true },
    }),
    prisma.walletLedger.aggregate({
      where: { astrologerProfileId, kind: "PAYOUT" },
      _sum: { amountInr: true },
    }),
    prisma.payout.aggregate({
      where: { astrologerProfileId, status: { in: ["REQUESTED", "APPROVED", "PROCESSING"] } },
      _sum: { amountInr: true },
    }),
    currentBalance(astrologerProfileId),
  ]);
  return {
    totalEarnedInr: totalEarned._sum.amountInr ?? 0,
    lifetimePayoutInr: Math.abs(totalPayout._sum.amountInr ?? 0),
    pendingPayoutInr: pendingRequested._sum.amountInr ?? 0,
    walletBalanceInr: balance,
  };
}
