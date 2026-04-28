import { TopBar } from "@/frontend/components/portal/TopBar";
import { CardLight } from "@/frontend/components/ui/CardLight";
import { getLlmStats } from "@/backend/services/llm/stats.service";

export const dynamic = "force-dynamic";

const PROVIDER_TONE: Record<string, string> = {
  gemini: "bg-[var(--color-brand-violet)]",
  groq: "bg-[var(--color-brand-aqua)]",
  anthropic: "bg-[var(--color-brand-gold)]",
  openai: "bg-[var(--color-brand-rose)]",
};

function fmtUsd(usdMicro: number): string {
  const usd = usdMicro / 1_000_000;
  if (usd === 0) return "$0";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

function fmtN(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default async function LlmCost() {
  const stats = await getLlmStats(30);
  const { totals } = stats;
  const errorRatePct = totals.calls ? (totals.errorCalls / totals.calls) * 100 : 0;
  const maxRouteCost = stats.byRoute[0]?.costUsdMicro ?? 1;

  return (
    <>
      <TopBar
        title={`LLM cost · last ${stats.windowDays} days`}
        subtitle={`${totals.calls} calls · ${totals.okCalls} ok · ${totals.errorCalls} errors`}
        light
        initials="A"
      />
      <div className="p-6 space-y-6 max-w-6xl">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Kpi label="Spend" value={fmtUsd(totals.costUsdMicro)} />
          <Kpi label="Input tokens" value={fmtN(totals.inputTokens)} />
          <Kpi label="Output tokens" value={fmtN(totals.outputTokens)} />
          <Kpi label="Latency p95" value={`${totals.p95LatencyMs}ms`} sub={`p50 ${totals.p50LatencyMs}ms`} />
          <Kpi label="Error rate" value={`${errorRatePct.toFixed(1)}%`} sub={`${totals.errorCalls} of ${totals.calls}`} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <CardLight>
            <h3 className="font-semibold mb-4">By provider</h3>
            {stats.byProvider.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-muted-light)]">
                No LLM calls yet in this window. Generate a horoscope to populate the dashboard.
              </p>
            ) : (
              <ul className="space-y-3">
                {stats.byProvider.map((p) => (
                  <li key={p.provider} className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${PROVIDER_TONE[p.provider] ?? "bg-gray-400"}`} />
                    <span className="capitalize w-28">{p.provider}</span>
                    <span className="tabular-nums text-sm text-[var(--color-ink-muted-light)] w-20">{p.calls} calls</span>
                    <span className="tabular-nums text-sm text-[var(--color-ink-muted-light)] w-24">{p.avgLatencyMs}ms avg</span>
                    <span className="tabular-nums text-sm font-medium ml-auto">{fmtUsd(p.costUsdMicro)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardLight>

          <CardLight>
            <h3 className="font-semibold mb-4">Top routes by cost</h3>
            {stats.byRoute.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-muted-light)]">No routes yet.</p>
            ) : (
              <div className="space-y-2.5">
                {stats.byRoute.slice(0, 8).map((r) => (
                  <div key={r.route} className="text-sm">
                    <div className="flex justify-between text-xs mb-1 gap-3">
                      <span className="font-mono text-[var(--color-ink-muted-light)] truncate">{r.route}</span>
                      <span className="tabular-nums whitespace-nowrap">
                        {fmtUsd(r.costUsdMicro)} <span className="text-[var(--color-ink-muted-light)]">({r.calls})</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--color-surface-2-light)] overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[var(--color-brand-violet)] to-[var(--color-brand-rose)]"
                        style={{ width: `${(r.costUsdMicro / maxRouteCost) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardLight>
        </div>

        <CardLight>
          <h3 className="font-semibold mb-3">Recent errors</h3>
          {stats.recentErrors.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-muted-light)]">No LLM errors in the last {stats.windowDays} days. 🟢</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border-light)]">
              {stats.recentErrors.map((e, i) => (
                <li key={i} className="py-2.5 flex gap-3 items-start text-sm">
                  <span className="text-xs text-[var(--color-ink-muted-light)] w-32 shrink-0">
                    {e.createdAt.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                  <span className="font-mono text-xs w-44 shrink-0 truncate">{e.route}</span>
                  <span className="capitalize w-20 shrink-0">{e.provider}</span>
                  <span className="text-[var(--color-brand-rose)] flex-1 break-words">{e.error ?? "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </CardLight>
      </div>
    </>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <CardLight>
      <div className="text-xs text-[var(--color-ink-muted-light)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {sub ? <div className="text-[11px] text-[var(--color-ink-muted-light)] mt-0.5">{sub}</div> : null}
    </CardLight>
  );
}
