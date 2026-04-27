import { TopBar } from "@/frontend/components/portal/TopBar";
import { CardLight } from "@/frontend/components/ui/CardLight";
import { Button } from "@/frontend/components/ui/Button";
import { CountUp } from "@/frontend/components/effects/CountUp";

const KPIS = [
  { label: "Spend",        val: 5820, prefix: "$",                tone: "gold"   as const },
  { label: "Tokens",       val: 182,  suffix: "M",                tone: "violet" as const },
  { label: "Avg ms p95",   val: 1420,                              tone: "aqua"   as const },
  { label: "Error rate",   val: 0.41, decimals: 2, suffix: "%",   tone: "rose"   as const },
  { label: "Cost / user",  val: 0.038, decimals: 3, prefix: "$",  tone: "violet" as const },
];

const ROUTES = [
  { t: "/api/predictions/yearly", v: 1.00, cost: "$2,140" },
  { t: "/api/ai-chat",            v: 0.78, cost: "$1,690" },
  { t: "/api/predictions/daily",  v: 0.55, cost: "$1,180" },
  { t: "/api/reports/career",     v: 0.31, cost: "$  680" },
  { t: "/api/compatibility",      v: 0.12, cost: "$  140" },
];

const RULES = [
  { route: "daily horoscope", config: "Gemini 2.5 Flash · cache 24h",   on: true  },
  { route: "ai chat",         config: "Claude 4 Sonnet · stream",        on: true  },
  { route: "yearly report",   config: "Claude 4 Opus · async queue",     on: true  },
  { route: "compatibility",   config: "Groq Llama 3.3 70B",              on: false },
];

export default function LlmCost() {
  return (
    <>
      <TopBar title="LLM Cost · last 30 days" subtitle="Spend, tokens, latency, routing"
              light right={<Button variant="outline" size="sm">Last 30 days</Button>} initials="A" />

      <div className="p-6 space-y-6">
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
            </CardLight>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          <CardLight>
            <h3 className="font-semibold mb-4">Cost by provider · stacked</h3>
            <StackedBars />
            <div className="flex items-center gap-5 mt-3 text-xs">
              <Legend color="var(--color-brand-violet)" label="Gemini" />
              <Legend color="var(--color-brand-aqua)"   label="Groq" />
              <Legend color="var(--color-brand-gold)"   label="Claude" />
            </div>
          </CardLight>

          <CardLight>
            <h3 className="font-semibold mb-4">Top routes by cost</h3>
            <div className="space-y-2">
              {ROUTES.map((r) => (
                <div key={r.t} className="text-sm">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-mono text-[var(--color-ink-muted-light)]">{r.t}</span>
                    <span className="tabular-nums">{r.cost}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--color-surface-2-light)] overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[var(--color-brand-violet)] to-[var(--color-brand-rose)]"
                         style={{ width: `${r.v * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardLight>
        </div>

        <CardLight>
          <h3 className="font-semibold mb-4">Routing config (LLM router)</h3>
          <ul className="divide-y divide-[var(--color-border-light)]">
            {RULES.map((r) => (
              <li key={r.route} className="flex items-center gap-3 py-3">
                <div className="w-44 font-medium">{r.route}</div>
                <div className="flex-1 text-sm text-[var(--color-ink-muted-light)]">{r.config}</div>
                <Toggle on={r.on} />
              </li>
            ))}
          </ul>
        </CardLight>
      </div>
    </>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={`inline-flex w-11 h-6 rounded-full p-0.5 transition-colors ${
        on ? "bg-[var(--color-brand-aqua)]" : "bg-[var(--color-brand-rose)]"
      }`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white transition-transform shadow ${on ? "translate-x-5" : "translate-x-0"}`}
      />
    </span>
  );
}

function StackedBars() {
  const W = 800, H = 220, n = 14;
  const step = W / n;
  const bw = step * 0.6;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-56">
      {Array.from({ length: n }).map((_, i) => {
        const x = i * step + step * 0.2;
        const gem  = 60 + (i % 5) * 8;
        const groq = 35 + ((i + 1) % 4) * 6;
        const clau = 25 + (i % 3) * 5;
        let y = H - 20;
        return (
          <g key={i}>
            <rect x={x} y={(y -= gem)}  width={bw} height={gem}  fill="var(--color-brand-violet)" rx="3" />
            <rect x={x} y={(y -= groq)} width={bw} height={groq} fill="var(--color-brand-aqua)"   rx="3" />
            <rect x={x} y={(y -= clau)} width={bw} height={clau} fill="var(--color-brand-gold)"   rx="3" />
          </g>
        );
      })}
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
