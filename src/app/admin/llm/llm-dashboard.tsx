"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/frontend/components/ui/Button";
import { CardLight } from "@/frontend/components/ui/CardLight";
import { formatNumber, formatUsdMicro } from "@/shared/format";

interface Period {
  calls: number;
  costUsdMicro: number;
  byProvider: { provider: string; calls: number; costUsdMicro: number }[];
  bySurface: { surface: string; calls: number; costUsdMicro: number }[];
}

interface Summary {
  today: Period;
  last7d: Period;
  last30d: Period;
  successRatePct: number;
  dailySeries: { date: string; calls: number; costUsdMicro: number }[];
}

interface CallRow {
  id: string;
  userId: string | null;
  route: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsdMicro: number;
  latencyMs: number;
  status: string;
  error: string | null;
  createdAt: string;
}

const CALLS_PAGE = 50;

export function LlmDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [calls, setCalls] = useState<CallRow[] | null>(null);
  const [callsTotal, setCallsTotal] = useState(0);
  const [callsOffset, setCallsOffset] = useState(0);
  const [filter, setFilter] = useState<{ provider?: string; status?: string }>({});
  const [err, setErr] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetch("/api/admin/llm/summary", { cache: "no-store" });
      if (!res.ok) throw new Error(`summary failed (${res.status})`);
      setSummary((await res.json()) as Summary);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "summary failed");
    }
  }, []);

  const loadCalls = useCallback(async () => {
    try {
      const p = new URLSearchParams();
      p.set("limit", String(CALLS_PAGE));
      p.set("offset", String(callsOffset));
      if (filter.provider) p.set("provider", filter.provider);
      if (filter.status) p.set("status", filter.status);
      const res = await fetch(`/api/admin/llm/calls?${p.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`calls failed (${res.status})`);
      const j = (await res.json()) as { rows: CallRow[]; total: number };
      setCalls(j.rows);
      setCallsTotal(j.total);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "calls failed");
    }
  }, [callsOffset, filter]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);
  useEffect(() => {
    void loadCalls();
  }, [loadCalls]);

  if (err) {
    return (
      <CardLight className="border-[var(--color-brand-rose)]/40">
        <p className="text-sm text-[var(--color-brand-rose)]">{err}</p>
      </CardLight>
    );
  }

  if (!summary) {
    return <CardLight>Loading…</CardLight>;
  }

  const totalProviderCost30 = summary.last30d.byProvider.reduce((a, b) => a + b.costUsdMicro, 0);
  const maxDailyCost = Math.max(1, ...summary.dailySeries.map((d) => d.costUsdMicro));

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi label="Today" value={formatUsdMicro(summary.today.costUsdMicro)} sub={`${summary.today.calls} calls`} />
        <Kpi label="Last 7 days" value={formatUsdMicro(summary.last7d.costUsdMicro)} sub={`${summary.last7d.calls} calls`} />
        <Kpi label="Last 30 days" value={formatUsdMicro(summary.last30d.costUsdMicro)} sub={`${summary.last30d.calls} calls`} />
        <Kpi label="Calls (30d)" value={formatNumber(summary.last30d.calls)} />
        <Kpi label="Success rate (30d)" value={`${summary.successRatePct.toFixed(1)}%`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <CardLight>
          <h3 className="font-semibold mb-3 text-sm">Provider breakdown · 30d</h3>
          {!summary.last30d.byProvider.length ? (
            <p className="text-sm text-[var(--color-ink-muted-light)]">No calls yet.</p>
          ) : (
            <div className="space-y-2">
              {summary.last30d.byProvider.map((p) => {
                const pct = totalProviderCost30 ? (p.costUsdMicro / totalProviderCost30) * 100 : 0;
                return (
                  <div key={p.provider} className="text-sm">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="capitalize">{p.provider}</span>
                      <span className="tabular-nums">
                        {formatUsdMicro(p.costUsdMicro)} · {p.calls} calls · {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--color-surface-2-light)] overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[var(--color-brand-violet)] to-[var(--color-brand-rose)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardLight>

        <CardLight>
          <h3 className="font-semibold mb-3 text-sm">Surface breakdown · 30d</h3>
          {!summary.last30d.bySurface.length ? (
            <p className="text-sm text-[var(--color-ink-muted-light)]">No calls yet.</p>
          ) : (
            <div className="space-y-2">
              {summary.last30d.bySurface.slice(0, 8).map((s) => {
                const pct = summary.last30d.costUsdMicro ? (s.costUsdMicro / summary.last30d.costUsdMicro) * 100 : 0;
                return (
                  <div key={s.surface} className="text-sm">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-mono">{s.surface}</span>
                      <span className="tabular-nums">{formatUsdMicro(s.costUsdMicro)} ({s.calls})</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--color-surface-2-light)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--color-brand-aqua)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardLight>
      </div>

      <CardLight>
        <h3 className="font-semibold mb-3 text-sm">Daily cost · last 30 days</h3>
        <div className="flex items-end gap-1 h-32">
          {summary.dailySeries.map((d) => {
            const h = (d.costUsdMicro / maxDailyCost) * 100;
            return (
              <div
                key={d.date}
                className="flex-1 bg-[var(--color-brand-violet)]/70 hover:bg-[var(--color-brand-violet)] rounded-t transition-colors"
                style={{ height: `${Math.max(h, 1)}%` }}
                title={`${d.date}: ${formatUsdMicro(d.costUsdMicro)} · ${d.calls} calls`}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-[var(--color-ink-muted-light)] mt-1">
          <span>{summary.dailySeries[0]?.date}</span>
          <span>{summary.dailySeries[summary.dailySeries.length - 1]?.date}</span>
        </div>
      </CardLight>

      <CardLight className="!p-0 overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-3 border-b border-[var(--color-border-light)]">
          <h3 className="font-semibold text-sm">Recent calls</h3>
          <select
            value={filter.provider ?? ""}
            onChange={(e) => {
              setCallsOffset(0);
              setFilter((f) => ({ ...f, provider: e.target.value || undefined }));
            }}
            className="ml-auto h-8 rounded-md border border-input bg-transparent px-2 text-xs"
          >
            <option value="">All providers</option>
            {summary.last30d.byProvider.map((p) => (
              <option key={p.provider} value={p.provider}>
                {p.provider}
              </option>
            ))}
          </select>
          <select
            value={filter.status ?? ""}
            onChange={(e) => {
              setCallsOffset(0);
              setFilter((f) => ({ ...f, status: e.target.value || undefined }));
            }}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
          >
            <option value="">All statuses</option>
            <option value="ok">ok</option>
            <option value="error">error</option>
          </select>
        </div>
        {!calls ? (
          <div className="p-8 text-sm text-center text-[var(--color-ink-muted-light)]">Loading…</div>
        ) : !calls.length ? (
          <div className="p-8 text-sm text-center text-[var(--color-ink-muted-light)]">No calls match.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-2-light)] text-left text-xs uppercase tracking-wider text-[var(--color-ink-muted-light)]">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Surface</th>
                <th className="px-3 py-2 font-medium">Provider · Model</th>
                <th className="px-3 py-2 font-medium text-right">Tokens</th>
                <th className="px-3 py-2 font-medium text-right">Cost</th>
                <th className="px-3 py-2 font-medium text-right">Latency</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((c) => (
                <tr key={c.id} className="border-t border-[var(--color-border-light)]">
                  <td className="px-3 py-2 text-[var(--color-ink-muted-light)] whitespace-nowrap">
                    {new Date(c.createdAt).toLocaleString("en-GB", {
                      year: "2-digit",
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{c.route}</td>
                  <td className="px-3 py-2 text-[var(--color-ink-muted-light)]">
                    {c.provider} · <span className="font-mono text-xs">{c.model}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-[var(--color-ink-muted-light)]">
                    {c.inputTokens}/{c.outputTokens}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatUsdMicro(c.costUsdMicro)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-[var(--color-ink-muted-light)]">
                    {c.latencyMs}ms
                  </td>
                  <td className="px-3 py-2">
                    {c.status === "ok" ? (
                      <span className="inline-block rounded-md border border-[var(--color-brand-aqua)]/40 bg-[var(--color-brand-aqua)]/10 text-[#0a8273] px-2 py-0.5 text-xs">
                        ok
                      </span>
                    ) : (
                      <span
                        className="inline-block rounded-md border border-[var(--color-brand-rose)]/40 bg-[var(--color-brand-rose)]/10 text-[#a13333] px-2 py-0.5 text-xs"
                        title={c.error ?? ""}
                      >
                        error
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="px-4 py-2 flex items-center justify-between border-t border-[var(--color-border-light)] text-xs">
          <span className="text-[var(--color-ink-muted-light)]">
            {calls ? `${callsOffset + 1}–${Math.min(callsOffset + CALLS_PAGE, callsTotal)} of ${callsTotal}` : "—"}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={callsOffset === 0}
              onClick={() => setCallsOffset(Math.max(0, callsOffset - CALLS_PAGE))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={callsOffset + CALLS_PAGE >= callsTotal}
              onClick={() => setCallsOffset(callsOffset + CALLS_PAGE)}
            >
              Next
            </Button>
          </div>
        </div>
      </CardLight>
    </div>
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
