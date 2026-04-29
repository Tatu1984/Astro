import { prisma } from "@/backend/database/client";

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
  percentOfStart: number;
}

const FUNNEL_LABELS: Record<string, string> = {
  SIGNUP: "Signed up",
  ADDED_BIRTH_PROFILE: "Added a birth profile",
  VIEWED_FIRST_CHART: "Viewed first chart",
  READ_FIRST_PREDICTION: "Read first prediction",
  STARTED_AI_CHAT: "Started AI chat",
  BOOKED_FIRST_CONSULT: "Booked first consult",
};

export async function computeFunnel(daysWindow = 30): Promise<{
  windowDays: number;
  signupSince: Date;
  stages: FunnelStage[];
}> {
  const since = new Date(Date.now() - daysWindow * 24 * 60 * 60 * 1000);
  const userIds = await prisma.user.findMany({
    where: { createdAt: { gte: since }, deletedAt: null },
    select: { id: true },
  });
  const ids = userIds.map((u) => u.id);
  const total = ids.length;

  if (total === 0) {
    return {
      windowDays: daysWindow,
      signupSince: since,
      stages: Object.keys(FUNNEL_LABELS).map((key) => ({
        key,
        label: FUNNEL_LABELS[key],
        count: 0,
        percentOfStart: 0,
      })),
    };
  }

  const [profileUsers, chartUsers, predictionUsers, chatUsers, bookingUsers] = await Promise.all([
    prisma.profile
      .findMany({ where: { userId: { in: ids }, deletedAt: null }, select: { userId: true }, distinct: ["userId"] })
      .then((rows) => rows.length),
    prisma.chart
      .findMany({ where: { userId: { in: ids } }, select: { userId: true }, distinct: ["userId"] })
      .then((rows) => rows.length),
    prisma.prediction
      .findMany({ where: { userId: { in: ids } }, select: { userId: true }, distinct: ["userId"] })
      .then((rows) => rows.length),
    prisma.aiChatSession
      .findMany({ where: { userId: { in: ids } }, select: { userId: true }, distinct: ["userId"] })
      .then((rows) => rows.length),
    prisma.booking
      .findMany({ where: { userId: { in: ids } }, select: { userId: true }, distinct: ["userId"] })
      .then((rows) => rows.length),
  ]);

  const counts: Record<string, number> = {
    SIGNUP: total,
    ADDED_BIRTH_PROFILE: profileUsers,
    VIEWED_FIRST_CHART: chartUsers,
    READ_FIRST_PREDICTION: predictionUsers,
    STARTED_AI_CHAT: chatUsers,
    BOOKED_FIRST_CONSULT: bookingUsers,
  };

  const stages: FunnelStage[] = Object.entries(FUNNEL_LABELS).map(([key, label]) => ({
    key,
    label,
    count: counts[key] ?? 0,
    percentOfStart: total > 0 ? (counts[key] ?? 0) / total : 0,
  }));

  return { windowDays: daysWindow, signupSince: since, stages };
}

// ---------------- Cohort ----------------

export interface CohortRow {
  cohortStart: string;
  cohortSize: number;
  cells: number[];
}

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  const day = out.getUTCDay();
  // Monday-anchored — Sunday becomes 7 so it goes back 6 days.
  const offset = day === 0 ? 6 : day - 1;
  out.setUTCDate(out.getUTCDate() - offset);
  return out;
}

export async function computeCohort(weeksBack = 12): Promise<CohortRow[]> {
  const now = new Date();
  const earliest = startOfWeek(new Date(now.getTime() - weeksBack * 7 * 24 * 60 * 60 * 1000));

  const users = await prisma.user.findMany({
    where: { createdAt: { gte: earliest }, deletedAt: null },
    select: { id: true, createdAt: true },
  });

  // Group user ids by cohort week
  const cohorts = new Map<string, string[]>();
  for (const u of users) {
    const k = startOfWeek(u.createdAt).toISOString().slice(0, 10);
    const arr = cohorts.get(k) ?? [];
    arr.push(u.id);
    cohorts.set(k, arr);
  }

  // For each user, gather activity timestamps once, then map to weeks-after-cohort.
  const allIds = users.map((u) => u.id);
  if (allIds.length === 0) return [];

  const [predictions, chats, bookings] = await Promise.all([
    prisma.prediction.findMany({
      where: { userId: { in: allIds } },
      select: { userId: true, createdAt: true },
    }),
    prisma.aiChatMessage.findMany({
      where: { session: { userId: { in: allIds } } },
      select: { createdAt: true, session: { select: { userId: true } } },
    }),
    prisma.booking.findMany({
      where: { userId: { in: allIds } },
      select: { userId: true, createdAt: true },
    }),
  ]);

  const activityByUser = new Map<string, Date[]>();
  function push(uid: string, d: Date) {
    const arr = activityByUser.get(uid) ?? [];
    arr.push(d);
    activityByUser.set(uid, arr);
  }
  for (const p of predictions) push(p.userId, p.createdAt);
  for (const c of chats) push(c.session.userId, c.createdAt);
  for (const b of bookings) push(b.userId, b.createdAt);

  const userCreated = new Map(users.map((u) => [u.id, u.createdAt]));

  // Build cohorts in chronological order
  const sortedCohortKeys = Array.from(cohorts.keys()).sort();
  const out: CohortRow[] = [];
  for (const key of sortedCohortKeys) {
    const ids = cohorts.get(key)!;
    const cohortStart = new Date(`${key}T00:00:00.000Z`).getTime();
    const possibleWeeks = Math.min(
      weeksBack,
      Math.floor((now.getTime() - cohortStart) / (7 * 24 * 60 * 60 * 1000)) + 1,
    );
    const cells: number[] = [];
    for (let w = 0; w < possibleWeeks; w++) {
      const weekStart = cohortStart + w * 7 * 24 * 60 * 60 * 1000;
      const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;
      let active = 0;
      for (const uid of ids) {
        const created = userCreated.get(uid)?.getTime() ?? 0;
        if (created >= weekEnd) continue;
        const acts = activityByUser.get(uid) ?? [];
        if (acts.some((d) => d.getTime() >= weekStart && d.getTime() < weekEnd)) active++;
      }
      cells.push(ids.length > 0 ? active / ids.length : 0);
    }
    out.push({ cohortStart: key, cohortSize: ids.length, cells });
  }
  return out;
}

// ---------------- Anomalies ----------------

export type AnomalySeverity = "INFO" | "WARN" | "CRITICAL";

export interface AnomalyCheck {
  name: string;
  current: number;
  baseline: number;
  ratio: number;
  flagged: boolean;
  severity: AnomalySeverity;
  detail?: string;
}

function classify(ratio: number, direction: "high" | "low"): { flagged: boolean; severity: AnomalySeverity } {
  if (direction === "high") {
    if (ratio >= 4) return { flagged: true, severity: "CRITICAL" };
    if (ratio >= 2) return { flagged: true, severity: "WARN" };
    return { flagged: false, severity: "INFO" };
  }
  if (ratio <= 0.1) return { flagged: true, severity: "CRITICAL" };
  if (ratio <= 0.3) return { flagged: true, severity: "WARN" };
  return { flagged: false, severity: "INFO" };
}

export async function computeAnomalies(): Promise<{ checks: AnomalyCheck[] }> {
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const todayStart = new Date(now.getTime() - dayMs);
  const sevenStart = new Date(now.getTime() - 8 * dayMs);
  const sevenEnd = todayStart;

  // 1) LLM cost today vs trailing 7d avg
  const [todayCost, trailing7Cost] = await Promise.all([
    prisma.llmCallLog.aggregate({
      where: { createdAt: { gte: todayStart, lt: now }, status: "ok" },
      _sum: { costUsdMicro: true },
    }),
    prisma.llmCallLog.aggregate({
      where: { createdAt: { gte: sevenStart, lt: sevenEnd }, status: "ok" },
      _sum: { costUsdMicro: true },
    }),
  ]);
  const todayCostMicro = todayCost._sum.costUsdMicro ?? 0;
  const baselineCostMicro = (trailing7Cost._sum.costUsdMicro ?? 0) / 7;
  const llmCostRatio = baselineCostMicro > 0 ? todayCostMicro / baselineCostMicro : todayCostMicro > 0 ? 99 : 1;
  const llmCostClass = classify(llmCostRatio, "high");

  // 2) Today's signups vs trailing 7d avg
  const [todaySignups, trailing7Signups] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: todayStart, lt: now }, deletedAt: null } }),
    prisma.user.count({ where: { createdAt: { gte: sevenStart, lt: sevenEnd }, deletedAt: null } }),
  ]);
  const baselineSignups = trailing7Signups / 7;
  const signupRatio = baselineSignups > 0 ? todaySignups / baselineSignups : todaySignups > 0 ? 1 : 1;
  const signupClass = classify(signupRatio, "low");

  // 3) Refund count
  const [todayRefunds, trailing7Refunds] = await Promise.all([
    prisma.booking.count({
      where: { status: "REFUNDED", updatedAt: { gte: todayStart, lt: now } },
    }),
    prisma.booking.count({
      where: { status: "REFUNDED", updatedAt: { gte: sevenStart, lt: sevenEnd } },
    }),
  ]);
  const baselineRefunds = trailing7Refunds / 7;
  const refundRatio = baselineRefunds > 0 ? todayRefunds / baselineRefunds : todayRefunds > 0 ? 99 : 1;
  const refundClass = classify(refundRatio, "high");

  // 4) Failed-LLM-call rate
  const [todayLlm, trailingLlm] = await Promise.all([
    prisma.llmCallLog.groupBy({
      by: ["status"],
      where: { createdAt: { gte: todayStart, lt: now } },
      _count: { _all: true },
    }),
    prisma.llmCallLog.groupBy({
      by: ["status"],
      where: { createdAt: { gte: sevenStart, lt: sevenEnd } },
      _count: { _all: true },
    }),
  ]);

  function failureRate(rows: Array<{ status: string; _count: { _all: number } }>): {
    rate: number;
    total: number;
  } {
    let total = 0;
    let failed = 0;
    for (const r of rows) {
      total += r._count._all;
      if (r.status !== "ok") failed += r._count._all;
    }
    return { rate: total > 0 ? failed / total : 0, total };
  }
  const todayRate = failureRate(todayLlm);
  const baselineRate = failureRate(trailingLlm);
  const failRatio = baselineRate.rate > 0 ? todayRate.rate / baselineRate.rate : todayRate.rate > 0 ? 99 : 1;
  const failClass = classify(failRatio, "high");

  return {
    checks: [
      {
        name: "LLM cost (today vs trailing 7d avg)",
        current: todayCostMicro / 1_000_000,
        baseline: baselineCostMicro / 1_000_000,
        ratio: llmCostRatio,
        flagged: llmCostClass.flagged,
        severity: llmCostClass.severity,
        detail: "Spend in USD",
      },
      {
        name: "New signups (today vs trailing 7d avg)",
        current: todaySignups,
        baseline: baselineSignups,
        ratio: signupRatio,
        flagged: signupClass.flagged,
        severity: signupClass.severity,
        detail: "User signups per day",
      },
      {
        name: "Refunds (today vs trailing 7d avg)",
        current: todayRefunds,
        baseline: baselineRefunds,
        ratio: refundRatio,
        flagged: refundClass.flagged,
        severity: refundClass.severity,
        detail: "Bookings transitioned to REFUNDED",
      },
      {
        name: "Failed LLM call rate (today vs trailing 7d avg)",
        current: todayRate.rate,
        baseline: baselineRate.rate,
        ratio: failRatio,
        flagged: failClass.flagged,
        severity: failClass.severity,
        detail: `${todayRate.total} calls today`,
      },
    ],
  };
}
