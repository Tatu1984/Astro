import { TopBar } from "@/frontend/components/portal/TopBar";
import { CardLight } from "@/frontend/components/ui/CardLight";
import { Button } from "@/frontend/components/ui/Button";
import { CountUp } from "@/frontend/components/effects/CountUp";

import { requireRole } from "@/backend/auth/requireRole";
import { prisma } from "@/backend/database/client";
import { ExportButtons } from "./export-buttons";
import { formatUsdMicro } from "@/shared/format";

export const dynamic = "force-dynamic";

interface Overview {
  dau: number;
  mau: number;
  signupsLast7d: number;
  signupsLast30d: number;
  bookingsLast30d: number;
  llmCostLast30dUsdMicro: number;
  openModerationCount: number;
  pendingPayoutsCount: number;
  pendingKycCount: number;
}

async function loadOverview(): Promise<Overview> {
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
    prisma.prediction.findMany({ where: { createdAt: { gte: day1 } }, distinct: ["userId"], select: { userId: true } }),
    prisma.aiChatSession.findMany({ where: { updatedAt: { gte: day1 } }, distinct: ["userId"], select: { userId: true } }),
    prisma.booking.findMany({ where: { createdAt: { gte: day1 } }, distinct: ["userId"], select: { userId: true } }),
    prisma.prediction.findMany({ where: { createdAt: { gte: day30 } }, distinct: ["userId"], select: { userId: true } }),
    prisma.aiChatSession.findMany({ where: { updatedAt: { gte: day30 } }, distinct: ["userId"], select: { userId: true } }),
    prisma.booking.findMany({ where: { createdAt: { gte: day30 } }, distinct: ["userId"], select: { userId: true } }),
    prisma.user.count({ where: { createdAt: { gte: day7 }, deletedAt: null } }),
    prisma.user.count({ where: { createdAt: { gte: day30 }, deletedAt: null } }),
    prisma.booking.count({ where: { createdAt: { gte: day30 } } }),
    prisma.llmCallLog.aggregate({ where: { createdAt: { gte: day30 } }, _sum: { costUsdMicro: true } }),
    prisma.post.count({ where: { hiddenAt: null, deletedAt: null } }),
    prisma.payout.count({ where: { status: { in: ["REQUESTED", "APPROVED", "PROCESSING"] } } }),
    prisma.kycDocument.count({ where: { status: "PENDING" } }),
  ]);

  const dau = new Set([...dauPredictions, ...dauChats, ...dauBookings].map((r) => r.userId)).size;
  const mau = new Set([...mauPredictions, ...mauChats, ...mauBookings].map((r) => r.userId)).size;

  return {
    dau,
    mau,
    signupsLast7d: signups7,
    signupsLast30d: signups30,
    bookingsLast30d: bookings30,
    llmCostLast30dUsdMicro: llmCost30._sum.costUsdMicro ?? 0,
    openModerationCount: openModeration,
    pendingPayoutsCount: pendingPayouts,
    pendingKycCount: pendingKyc,
  };
}

export default async function AdminOverview() {
  await requireRole("ADMIN");
  const o = await loadOverview();
  const llmDollars = o.llmCostLast30dUsdMicro / 1_000_000;

  return (
    <>
      <TopBar
        title="Operations Overview"
        subtitle="Live KPIs"
        light
        right={<Button variant="outline" size="sm">Last 30 days</Button>}
        initials="A"
      />
      <div className="p-6 space-y-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Kpi label="DAU" tone="aqua" value={o.dau} sub="active users today" />
          <Kpi label="MAU" tone="violet" value={o.mau} sub="last 30 days" />
          <Kpi label="Signups (7d)" tone="gold" value={o.signupsLast7d} sub={`${o.signupsLast30d} in 30d`} />
          <Kpi label="Bookings (30d)" tone="aqua" value={o.bookingsLast30d} />
          <Kpi
            label="LLM cost (30d)"
            tone="rose"
            value={llmDollars}
            decimals={2}
            prefix="$"
            sub={formatUsdMicro(o.llmCostLast30dUsdMicro)}
          />
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Kpi label="Pending KYC" tone="gold" value={o.pendingKycCount} sub="awaiting review" />
          <Kpi label="Pending payouts" tone="violet" value={o.pendingPayoutsCount} sub="requested or in progress" />
          <Kpi label="Visible posts" tone="aqua" value={o.openModerationCount} sub="not hidden / not deleted" />
        </div>

        <CardLight>
          <h3 className="font-semibold mb-3 text-sm">Exports</h3>
          <p className="text-xs text-[var(--color-ink-muted-light)] mb-3">
            CSV downloads. Capped at 50,000 rows — use date filters in the URL ({"?from="}ISO{"&to="}ISO) for larger windows.
          </p>
          <ExportButtons />
        </CardLight>
      </div>
    </>
  );
}

function Kpi({
  label,
  tone,
  value,
  sub,
  prefix,
  decimals,
}: {
  label: string;
  tone: "aqua" | "violet" | "gold" | "rose";
  value: number;
  sub?: string;
  prefix?: string;
  decimals?: number;
}) {
  return (
    <CardLight accent={tone}>
      <div className="text-xs text-[var(--color-ink-muted-light)]">{label}</div>
      <div className="mt-1 text-3xl font-semibold tabular-nums">
        <CountUp to={value} prefix={prefix ?? ""} decimals={decimals ?? 0} />
      </div>
      {sub ? <div className="text-xs text-[var(--color-ink-muted-light)] mt-1">{sub}</div> : null}
    </CardLight>
  );
}
