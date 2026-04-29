import { NextResponse } from "next/server";

import { requireRole } from "@/backend/auth/requireRole";
import { apiError } from "@/backend/utils/api.util";
import { prisma } from "@/backend/database/client";

interface PeriodSummary {
  calls: number;
  costUsdMicro: number;
  byProvider: { provider: string; calls: number; costUsdMicro: number }[];
  bySurface: { surface: string; calls: number; costUsdMicro: number }[];
}

async function summarisePeriod(since: Date): Promise<PeriodSummary> {
  const [agg, byProvider, bySurface] = await Promise.all([
    prisma.llmCallLog.aggregate({
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      _sum: { costUsdMicro: true },
    }),
    prisma.llmCallLog.groupBy({
      by: ["provider"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      _sum: { costUsdMicro: true },
    }),
    prisma.llmCallLog.groupBy({
      by: ["route"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      _sum: { costUsdMicro: true },
    }),
  ]);
  return {
    calls: agg._count._all,
    costUsdMicro: agg._sum.costUsdMicro ?? 0,
    byProvider: byProvider
      .map((r) => ({
        provider: r.provider,
        calls: r._count._all,
        costUsdMicro: r._sum.costUsdMicro ?? 0,
      }))
      .sort((a, b) => b.costUsdMicro - a.costUsdMicro),
    bySurface: bySurface
      .map((r) => ({
        surface: r.route,
        calls: r._count._all,
        costUsdMicro: r._sum.costUsdMicro ?? 0,
      }))
      .sort((a, b) => b.costUsdMicro - a.costUsdMicro),
  };
}

export async function GET() {
  try {
    await requireRole("ADMIN");

    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [today, p7, p30, last30Calls] = await Promise.all([
      summarisePeriod(dayStart),
      summarisePeriod(last7d),
      summarisePeriod(last30d),
      prisma.llmCallLog.findMany({
        where: { createdAt: { gte: last30d } },
        select: { createdAt: true, costUsdMicro: true, status: true },
      }),
    ]);

    const totalCalls = last30Calls.length;
    const okCalls = last30Calls.filter((c) => c.status === "ok").length;
    const successRatePct = totalCalls === 0 ? 100 : (okCalls / totalCalls) * 100;

    const dayBuckets = new Map<string, { calls: number; costUsdMicro: number }>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(dayStart.getTime() - i * 24 * 60 * 60 * 1000);
      dayBuckets.set(toDateKey(d), { calls: 0, costUsdMicro: 0 });
    }
    for (const c of last30Calls) {
      const key = toDateKey(c.createdAt);
      const b = dayBuckets.get(key);
      if (b) {
        b.calls += 1;
        b.costUsdMicro += c.costUsdMicro;
      }
    }
    const dailySeries = [...dayBuckets.entries()]
      .map(([date, v]) => ({ date, calls: v.calls, costUsdMicro: v.costUsdMicro }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    return NextResponse.json({
      today,
      last7d: p7,
      last30d: p30,
      successRatePct,
      dailySeries,
    });
  } catch (err) {
    return apiError(err);
  }
}

function toDateKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
