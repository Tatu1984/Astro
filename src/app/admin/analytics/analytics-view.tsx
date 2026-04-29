"use client";

import { useEffect, useState } from "react";

import { CardLight } from "@/frontend/components/ui/CardLight";

type Tab = "funnel" | "cohort" | "anomalies";

interface FunnelStage {
  key: string;
  label: string;
  count: number;
  percentOfStart: number;
}
interface FunnelResp {
  windowDays: number;
  signupSince: string;
  stages: FunnelStage[];
}

interface CohortRow {
  cohortStart: string;
  cohortSize: number;
  cells: number[];
}

interface AnomalyCheck {
  name: string;
  current: number;
  baseline: number;
  ratio: number;
  flagged: boolean;
  severity: "INFO" | "WARN" | "CRITICAL";
  detail?: string;
}

export function AnalyticsView() {
  const [tab, setTab] = useState<Tab>("funnel");

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-md border border-[var(--color-border-light)] bg-white p-0.5 shadow-sm">
        <TabButton active={tab === "funnel"} onClick={() => setTab("funnel")}>Funnel</TabButton>
        <TabButton active={tab === "cohort"} onClick={() => setTab("cohort")}>Cohort</TabButton>
        <TabButton active={tab === "anomalies"} onClick={() => setTab("anomalies")}>Anomalies</TabButton>
      </div>
      {tab === "funnel" ? <FunnelTab /> : null}
      {tab === "cohort" ? <CohortTab /> : null}
      {tab === "anomalies" ? <AnomaliesTab /> : null}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "px-3 py-1.5 text-xs rounded " +
        (active ? "bg-[var(--color-brand-violet)] text-white" : "text-[var(--color-ink-light)] hover:bg-black/5")
      }
    >
      {children}
    </button>
  );
}

function FunnelTab() {
  const [data, setData] = useState<FunnelResp | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/analytics/funnel?days=${days}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: FunnelResp) => setData(d))
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <CardLight>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[var(--color-ink-light)]">Onboarding funnel</h3>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-md border border-[var(--color-border-light)] bg-white px-2 py-1 text-xs"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>
      {loading || !data ? (
        <p className="text-sm text-[var(--color-ink-muted-light)]">Loading…</p>
      ) : (
        <ul className="space-y-2">
          {data.stages.map((s) => (
            <li key={s.key}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-[var(--color-ink-light)]">{s.label}</span>
                <span className="text-xs text-[var(--color-ink-muted-light)]">
                  {s.count.toLocaleString()} ({(s.percentOfStart * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="h-2 mt-1 rounded-full bg-black/5 overflow-hidden">
                <div
                  className="h-full bg-[var(--color-brand-violet)]"
                  style={{ width: `${(s.percentOfStart * 100).toFixed(1)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </CardLight>
  );
}

function CohortTab() {
  const [rows, setRows] = useState<CohortRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/analytics/cohort?weeks=12`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { rows: CohortRow[] }) => setRows(d.rows))
      .finally(() => setLoading(false));
  }, []);

  const maxWeeks = rows ? Math.max(...rows.map((r) => r.cells.length), 1) : 1;

  return (
    <CardLight>
      <h3 className="font-semibold text-[var(--color-ink-light)] mb-3">Weekly cohort retention</h3>
      <p className="text-xs text-[var(--color-ink-muted-light)] mb-3">
        Each cell = % of cohort with any activity (prediction / chat / booking) in week N. Cohort week is signup week.
      </p>
      {loading || !rows ? (
        <p className="text-sm text-[var(--color-ink-muted-light)]">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-muted-light)]">No cohorts yet — once users sign up, this fills in.</p>
      ) : (
        <div className="overflow-auto">
          <table className="text-xs">
            <thead>
              <tr>
                <th className="text-left px-2 py-1 text-[var(--color-ink-muted-light)]">Cohort</th>
                <th className="text-right px-2 py-1 text-[var(--color-ink-muted-light)]">Size</th>
                {Array.from({ length: maxWeeks }, (_, i) => (
                  <th key={i} className="text-center px-2 py-1 text-[var(--color-ink-muted-light)]">
                    W{i}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.cohortStart}>
                  <td className="px-2 py-1 text-[var(--color-ink-light)]">{r.cohortStart}</td>
                  <td className="px-2 py-1 text-right text-[var(--color-ink-light)]">{r.cohortSize}</td>
                  {Array.from({ length: maxWeeks }, (_, i) => {
                    const v = r.cells[i];
                    if (v === undefined) return <td key={i} className="px-2 py-1" />;
                    const pct = Math.round(v * 100);
                    return (
                      <td
                        key={i}
                        className="px-2 py-1 text-center"
                        style={{
                          background: `rgba(124, 92, 255, ${Math.min(0.85, v * 0.9 + (v > 0 ? 0.05 : 0))})`,
                          color: pct > 30 ? "white" : "var(--color-ink-light)",
                        }}
                      >
                        {pct}%
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CardLight>
  );
}

function AnomaliesTab() {
  const [checks, setChecks] = useState<AnomalyCheck[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/analytics/anomalies`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { checks: AnomalyCheck[] }) => setChecks(d.checks))
      .finally(() => setLoading(false));
  }, []);

  return (
    <CardLight>
      <h3 className="font-semibold text-[var(--color-ink-light)] mb-3">Anomaly checks</h3>
      {loading || !checks ? (
        <p className="text-sm text-[var(--color-ink-muted-light)]">Loading…</p>
      ) : (
        <ul className="space-y-2">
          {checks.map((c) => (
            <li
              key={c.name}
              className={
                "rounded-md border px-3 py-2.5 " +
                (c.flagged
                  ? c.severity === "CRITICAL"
                    ? "border-red-300 bg-red-50"
                    : "border-amber-300 bg-amber-50"
                  : "border-[var(--color-border-light)] bg-white")
              }
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-[var(--color-ink-light)]">{c.name}</p>
                <span
                  className={
                    "text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5 " +
                    (c.flagged
                      ? c.severity === "CRITICAL"
                        ? "bg-red-200 text-red-900"
                        : "bg-amber-200 text-amber-900"
                      : "bg-emerald-100 text-emerald-800")
                  }
                >
                  {c.flagged ? c.severity : "OK"}
                </span>
              </div>
              <p className="text-xs text-[var(--color-ink-muted-light)] mt-1">
                Current: {fmt(c.current)} · Baseline: {fmt(c.baseline)} · Ratio: {c.ratio.toFixed(2)}x
                {c.detail ? ` · ${c.detail}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </CardLight>
  );
}

function fmt(v: number): string {
  if (Number.isInteger(v)) return v.toLocaleString();
  return v.toFixed(3);
}
