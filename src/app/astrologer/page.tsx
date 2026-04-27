import { TopBar } from "@/frontend/components/portal/TopBar";
import { Card } from "@/frontend/components/ui/Card";
import { Button } from "@/frontend/components/ui/Button";
import { Badge } from "@/frontend/components/ui/Badge";
import { Avatar } from "@/frontend/components/ui/Avatar";
import { CountUp } from "@/frontend/components/effects/CountUp";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

const KPIS = [
  { label: "Today's earnings", val: 4820, prefix: "₹",  sub: "+18% vs yesterday", tone: "aqua"  as const },
  { label: "Active session",   val: 1,                 sub: "Maya · 12 min",     tone: "gold"  as const },
  { label: "Queue",            val: 7,                 sub: "Avg wait 4 min",    tone: "violet"as const },
  { label: "Avg rating",       val: 4.92,decimals: 2,  sub: "287 reviews",       tone: "rose"  as const },
];

const QUEUE = [
  { name: "Maya S.",  topic: "Career · 30m",  initials: "MS", tone: "violet" as const },
  { name: "Arjun M.", topic: "Marriage · 15m",initials: "AM", tone: "gold"   as const },
  { name: "Priya K.", topic: "Health · 60m",  initials: "PK", tone: "aqua"   as const },
  { name: "Rohan T.", topic: "General · 30m", initials: "RT", tone: "rose"   as const },
  { name: "Neha P.",  topic: "Career · 30m",  initials: "NP", tone: "violet" as const },
];

export default function AstrologerDashboard() {
  return (
    <>
      <TopBar
        title="Welcome back, Pandit Verma"
        subtitle="Sunday · 26 April 2026"
        right={<Badge tone="aqua" className="!text-[10px]">● Online</Badge>}
        initials="PV"
      />
      <div className="p-6 space-y-6">
        {/* KPI grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {KPIS.map((k) => (
            <Card key={k.label} accent={k.tone}>
              <div className="text-xs text-white/50">{k.label}</div>
              <div className="mt-1 text-3xl font-semibold text-white tabular-nums">
                <CountUp to={k.val} prefix={k.prefix ?? ""} decimals={k.decimals ?? 0} />
              </div>
              <div className="text-xs text-white/55 mt-1">{k.sub}</div>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          {/* earnings sparkline */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--color-brand-gold)]">Earnings · last 30 days</h3>
              <Button size="sm" variant="outline">Last 30 days</Button>
            </div>
            <Sparkline />
            <p className="text-xs text-white/45 mt-2">Average per day · ₹1,610</p>
          </Card>

          {/* live queue */}
          <Card accent="violet">
            <h3 className="font-semibold text-[var(--color-brand-gold)] mb-4">Live queue · 5 waiting</h3>
            <ul className="divide-y divide-[var(--color-border)] text-sm">
              {QUEUE.map((q) => (
                <li key={q.name} className="flex items-center gap-3 py-2.5">
                  <Avatar initials={q.initials} size={28} tone={q.tone} />
                  <div className="flex-1 min-w-0">
                    <div className="text-white truncate">{q.name}</div>
                    <div className="text-xs text-white/50 truncate">{q.topic}</div>
                  </div>
                  <Button size="sm" variant="gold">Accept</Button>
                </li>
              ))}
            </ul>
            <Link href="/astrologer/session" className="text-xs text-[var(--color-brand-gold)] mt-3 inline-flex items-center gap-1 hover:underline">
              Open active session <ArrowUpRight className="h-3 w-3" />
            </Link>
          </Card>
        </div>
      </div>
    </>
  );
}

function Sparkline() {
  // generate a deterministic SVG path
  const pts = [12, 18, 14, 22, 19, 26, 24, 30, 27, 32, 29, 35, 31, 38, 34, 41, 38, 42, 39, 44, 41, 47, 44, 50, 46, 52, 49, 54, 51, 58];
  const W = 800, H = 160, max = Math.max(...pts);
  const step = W / (pts.length - 1);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(2)} ${(H - (p / max) * H + 10).toFixed(2)}`).join(" ");
  const da = `${d} L ${W} ${H} L 0 ${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H + 10}`} className="w-full h-40">
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="var(--color-brand-aqua)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--color-brand-aqua)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={da} fill="url(#spark)" />
      <path d={d}  fill="none" stroke="var(--color-brand-aqua)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
