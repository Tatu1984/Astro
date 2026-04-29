import { NextResponse } from "next/server";

import { requireRole } from "@/backend/auth/requireRole";
import { apiError } from "@/backend/utils/api.util";
import { prisma } from "@/backend/database/client";

export async function GET() {
  try {
    await requireRole("ADMIN");

    const now = Date.now();
    const day1 = new Date(now - 24 * 60 * 60 * 1000);
    const day7 = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const day30 = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [
      dauPredictions,
      dauChats,
      dauBookings,
      mauPredictions,
      mauChats,
      mauBookings,
      signups7,
      signups30,
      bookings30,
      llmCost30,
      openModeration,
      pendingPayouts,
      pendingKyc,
    ] = await Promise.all([
      prisma.prediction.findMany({
        where: { createdAt: { gte: day1 } },
        distinct: ["userId"],
        select: { userId: true },
      }),
      prisma.aiChatSession.findMany({
        where: { updatedAt: { gte: day1 } },
        distinct: ["userId"],
        select: { userId: true },
      }),
      prisma.booking.findMany({
        where: { createdAt: { gte: day1 } },
        distinct: ["userId"],
        select: { userId: true },
      }),
      prisma.prediction.findMany({
        where: { createdAt: { gte: day30 } },
        distinct: ["userId"],
        select: { userId: true },
      }),
      prisma.aiChatSession.findMany({
        where: { updatedAt: { gte: day30 } },
        distinct: ["userId"],
        select: { userId: true },
      }),
      prisma.booking.findMany({
        where: { createdAt: { gte: day30 } },
        distinct: ["userId"],
        select: { userId: true },
      }),
      prisma.user.count({ where: { createdAt: { gte: day7 }, deletedAt: null } }),
      prisma.user.count({ where: { createdAt: { gte: day30 }, deletedAt: null } }),
      prisma.booking.count({ where: { createdAt: { gte: day30 } } }),
      prisma.llmCallLog.aggregate({
        where: { createdAt: { gte: day30 } },
        _sum: { costUsdMicro: true },
      }),
      prisma.post.count({ where: { hiddenAt: null, deletedAt: null } }),
      prisma.payout.count({ where: { status: { in: ["REQUESTED", "APPROVED", "PROCESSING"] } } }),
      prisma.kycDocument.count({ where: { status: "PENDING" } }),
    ]);

    const dauSet = new Set<string>([
      ...dauPredictions.map((r) => r.userId),
      ...dauChats.map((r) => r.userId),
      ...dauBookings.map((r) => r.userId),
    ]);
    const mauSet = new Set<string>([
      ...mauPredictions.map((r) => r.userId),
      ...mauChats.map((r) => r.userId),
      ...mauBookings.map((r) => r.userId),
    ]);

    return NextResponse.json({
      dau: dauSet.size,
      mau: mauSet.size,
      signupsLast7d: signups7,
      signupsLast30d: signups30,
      bookingsLast30d: bookings30,
      llmCostLast30dUsdMicro: llmCost30._sum.costUsdMicro ?? 0,
      openModerationCount: openModeration,
      pendingPayoutsCount: pendingPayouts,
      pendingKycCount: pendingKyc,
    });
  } catch (err) {
    return apiError(err);
  }
}
