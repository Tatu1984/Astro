import { prisma } from "@/backend/database/client";

export interface LlmStats {
  windowDays: number;
  totals: {
    calls: number;
    okCalls: number;
    errorCalls: number;
    inputTokens: number;
    outputTokens: number;
    costUsdMicro: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
  };
  byProvider: Array<{
    provider: string;
    calls: number;
    costUsdMicro: number;
    avgLatencyMs: number;
  }>;
  byRoute: Array<{
    route: string;
    calls: number;
    costUsdMicro: number;
    inputTokens: number;
    outputTokens: number;
  }>;
  recentErrors: Array<{
    createdAt: Date;
    route: string;
    provider: string;
    error: string | null;
  }>;
}

export async function getLlmStats(windowDays = 30): Promise<LlmStats> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const rows = await prisma.llmCallLog.findMany({
    where: { createdAt: { gte: since } },
    select: {
      route: true,
      provider: true,
      inputTokens: true,
      outputTokens: true,
      costUsdMicro: true,
      latencyMs: true,
      status: true,
    },
  });

  const calls = rows.length;
  const okCalls = rows.filter((r) => r.status === "ok").length;
  const errorCalls = calls - okCalls;
  const inputTokens = rows.reduce((s, r) => s + r.inputTokens, 0);
  const outputTokens = rows.reduce((s, r) => s + r.outputTokens, 0);
  const costUsdMicro = rows.reduce((s, r) => s + r.costUsdMicro, 0);

  const latencies = rows
    .filter((r) => r.status === "ok" && r.latencyMs > 0)
    .map((r) => r.latencyMs)
    .sort((a, b) => a - b);

  const pct = (p: number) => {
    if (!latencies.length) return 0;
    const idx = Math.min(latencies.length - 1, Math.floor(latencies.length * p));
    return latencies[idx];
  };

  const byProviderMap = new Map<string, { calls: number; costUsdMicro: number; latSum: number; latN: number }>();
  for (const r of rows) {
    const e = byProviderMap.get(r.provider) ?? { calls: 0, costUsdMicro: 0, latSum: 0, latN: 0 };
    e.calls++;
    e.costUsdMicro += r.costUsdMicro;
    if (r.latencyMs > 0) {
      e.latSum += r.latencyMs;
      e.latN++;
    }
    byProviderMap.set(r.provider, e);
  }
  const byProvider = Array.from(byProviderMap.entries())
    .map(([provider, e]) => ({
      provider,
      calls: e.calls,
      costUsdMicro: e.costUsdMicro,
      avgLatencyMs: e.latN ? Math.round(e.latSum / e.latN) : 0,
    }))
    .sort((a, b) => b.costUsdMicro - a.costUsdMicro);

  const byRouteMap = new Map<string, { calls: number; costUsdMicro: number; inputTokens: number; outputTokens: number }>();
  for (const r of rows) {
    const e = byRouteMap.get(r.route) ?? { calls: 0, costUsdMicro: 0, inputTokens: 0, outputTokens: 0 };
    e.calls++;
    e.costUsdMicro += r.costUsdMicro;
    e.inputTokens += r.inputTokens;
    e.outputTokens += r.outputTokens;
    byRouteMap.set(r.route, e);
  }
  const byRoute = Array.from(byRouteMap.entries())
    .map(([route, e]) => ({ route, ...e }))
    .sort((a, b) => b.costUsdMicro - a.costUsdMicro);

  const recentErrors = await prisma.llmCallLog.findMany({
    where: { status: "error", createdAt: { gte: since } },
    select: { createdAt: true, route: true, provider: true, error: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return {
    windowDays,
    totals: {
      calls,
      okCalls,
      errorCalls,
      inputTokens,
      outputTokens,
      costUsdMicro,
      p50LatencyMs: pct(0.5),
      p95LatencyMs: pct(0.95),
    },
    byProvider,
    byRoute,
    recentErrors,
  };
}
