import { TopBar } from "@/frontend/components/portal/TopBar";
import { CardLight } from "@/frontend/components/ui/CardLight";
import { Button } from "@/frontend/components/ui/Button";
import { CountUp } from "@/frontend/components/effects/CountUp";

const KPIS = [
  { label: "DAU",        val: 12840,   sub: "+6.2% wow",      tone: "aqua"   as const },
  { label: "MAU",        val: 184210,  sub: "+11.4% mom",     tone: "violet" as const },
  { label: "MRR",        val: 48210, prefix: "$", sub: "+9.1% mom", tone: "gold"  as const },
  { label: "LLM cost",   val: 1420,  prefix: "$", sub: "−4% wow",   tone: "rose"  as const },
  { label: "Crash-free", val: 99.83, decimals: 2, suffix: "%", sub: "iOS+Android", tone: "aqua" as const },
];

const FUNNEL = [
  { t: "Visit",   v: 1.00, c: "bg-[var(--color-brand-violet)]" },
  { t: "Sign-up", v: 0.62, c: "bg-[var(--color-brand-aqua)]" },
  { t: "Profile", v: 0.41, c: "bg-[var(--color-brand-gold)]" },
  { t: "Plus",    v: 0.18, c: "bg-[var(--color-brand-rose)]" },
  { t: "Pro",     v: 0.06, c: "bg-[var(--color-ink-muted-light)]" },
];

const ALERTS = [
  { t: "LLM error rate",  d: "Gemini 2.5 Pro · 2.4% errors last 1h",  tone: "rose"   as const },
  { t: "Queue depth",     d: "Astrologer queue avg wait 7m · target 4m", tone: "gold"   as const },
  { t: "Payment webhook", d: "Stripe webhook latency p95 1.4s",        tone: "aqua"  as const },
];

export default function AdminOverview() {
  return (
    <>
      <TopBar
        title="Operations Overview"
        subtitle="Last 7 days"
        light
        right={<Button variant="outline" size="sm">Last 7 days</Button>}
        initials="A"
      />
      <div className="p-6 space-y-6">
        {/* KPI grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {KPIS.map((k) => (
            <CardLight key={k.label} accent={k.tone}>
              <div className="text-xs text-[var(--color-ink-muted-light)]">{k.label}</div>
              <div className="mt-1 text-3xl font-semibold tabular-nums">
                <CountUp
                  to={k.val}
                  prefix={k.prefix ?? ""}
                  suffix={k.suffix ?? ""}
                  decimals={k.decimals ?? 0}
                />
              </div>
              <div className="text-xs text-[var(--color-ink-muted-light)] mt-1">{k.sub}</div>
            </CardLight>
          ))}
        </div>

        {/* charts row */}
        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          <CardLight>
            <h3 className="font-semibold mb-4">DAU / MAU · 90 days</h3>
            <DualSparkline />
            <div className="flex items-center gap-5 mt-3 text-xs">
              <Legend color="var(--color-brand-violet)" label="DAU" />
              <Legend color="var(--color-brand-aqua)"   label="MAU" />
            </div>
          </CardLight>

          <CardLight>
            <h3 className="font-semibold mb-4">Conversion funnel</h3>
            <div className="space-y-2">
              {FUNNEL.map((f) => (
                <div key={f.t} className="flex items-center gap-3 text-sm">
                  <span className="w-16 text-[var(--color-ink-muted-light)]">{f.t}</span>
                  <div className="flex-1 h-7 rounded-md bg-[var(--color-surface-2-light)] overflow-hidden">
                    <div className={`h-full ${f.c} flex items-center px-2 text-white text-xs font-semibold`}
                         style={{ width: `${f.v * 100}%` }}>
                      {(f.v * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardLight>
        </div>

        {/* alerts */}
        <CardLight>
          <h3 className="font-semibold mb-4">Active alerts</h3>
          <ul className="divide-y divide-[var(--color-border-light)]">
            {ALERTS.map((a) => (
              <li key={a.t} className="flex items-center gap-3 py-3">
                <span className={`h-2.5 w-2.5 rounded-full bg-[var(--color-brand-${a.tone})]`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{a.t}</div>
                  <div className="text-xs text-[var(--color-ink-muted-light)]">{a.d}</div>
                </div>
                <Button variant="outline" size="sm">Investigate</Button>
              </li>
            ))}
          </ul>
        </CardLight>
      </div>
    </>
  );
}

function DualSparkline() {
  const dau = [120,135,128,142,150,148,155,162,170,168,175,182,178,190,200,205,198,210,215,220,228,235,240,248,255,262,268,275,285,290];
  const mau = [85,92,90,98,105,108,112,118,122,128,132,138,140,145,150,155,160,168,172,180,185,190,195,202,208,215,220,228,234,240];
  const W = 800, H = 200;
  const path = (pts: number[]) => {
    const max = Math.max(...pts), step = W / (pts.length - 1);
    return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(2)} ${(H - (p / max) * (H - 20)).toFixed(2)}`).join(" ");
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-48">
      <path d={path(dau)} fill="none" stroke="var(--color-brand-violet)" strokeWidth="2.5" strokeLinejoin="round" />
      <path d={path(mau)} fill="none" stroke="var(--color-brand-aqua)"   strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[var(--color-ink-muted-light)]">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} /> {label}
    </span>
  );
}
