import { ChartWheel } from "@/frontend/components/astro/ChartWheel";
import { Card } from "@/frontend/components/ui/Card";
import { Badge } from "@/frontend/components/ui/Badge";
import { Button } from "@/frontend/components/ui/Button";
import { TopBar } from "@/frontend/components/portal/TopBar";
import { CountUp } from "@/frontend/components/effects/CountUp";
import { ArrowRight, Flame, TrendingUp, Calendar } from "lucide-react";
import { Aurora } from "@/frontend/components/effects/Aurora";

const TILES = [
  { icon: TrendingUp, title: "Vimshottari Dasha", body: "Saturn / Mercury — 4y left",       tone: "violet" as const },
  { icon: Calendar,   title: "Next big transit",  body: "Jupiter conj Sun · 12 May",        tone: "gold"   as const },
  { icon: Flame,      title: "Reading streak",    body: "23 days · keep going!",            tone: "rose"   as const },
];

const HOROSCOPES = [
  { title: "Career", body: "Mid-week brings clarity around a long-running negotiation. Speak first; the right words arrive when you start.", score: 78 },
  { title: "Love",   body: "Venus aspects favour emotional honesty. A conversation you've been avoiding becomes lighter than expected.",     score: 82 },
  { title: "Health", body: "Pace is your friend. Pushing today buys nothing; resting today buys the rest of the week.",                       score: 65 },
];

export default function UserToday() {
  return (
    <>
      <TopBar
        title="Good morning, Maya"
        subtitle="Sunday · 26 April 2026 · Mumbai"
        right={<Badge tone="aqua">● Online</Badge>}
      />
      <div className="p-6 space-y-6">
        {/* hero */}
        <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <Aurora />
          <div className="relative z-10 grid lg:grid-cols-[280px_1fr_280px] gap-6 items-center p-7">
            <div className="grid place-items-center">
              <ChartWheel size={240} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-white/40">Today, 26 Apr</p>
              <h2 className="mt-1 text-3xl font-semibold text-white">Moon trine your Sun</h2>
              <p className="mt-3 text-white/70 leading-relaxed max-w-md">
                A flowing day for communication and creative work. The mood is generous — let it be.
                Reach out to one person you've been meaning to.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button variant="gold">Read full reading <ArrowRight className="h-4 w-4" /></Button>
                <Button variant="outline">Share card</Button>
              </div>
            </div>
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-3">
              {TILES.map(({ icon: Icon, title, body, tone }) => (
                <Card key={title} accent={tone} className="!p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className={`h-4 w-4 text-[var(--color-brand-${tone})]`} />
                    <div className="text-xs text-white/55">{title}</div>
                  </div>
                  <div className="text-sm font-medium text-white leading-snug">{body}</div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* tabs */}
        <div className="flex items-center gap-1 rounded-md bg-[var(--color-card)] border border-[var(--color-border)] p-1 w-fit">
          {["Daily", "Weekly", "Monthly", "Yearly"].map((t, i) => (
            <button
              key={t}
              className={
                i === 0
                  ? "px-4 py-1.5 text-xs font-semibold rounded bg-[var(--color-brand-violet)] text-white"
                  : "px-4 py-1.5 text-xs text-white/60 hover:text-white"
              }
            >
              {t}
            </button>
          ))}
        </div>

        {/* mini horoscopes */}
        <div className="grid md:grid-cols-3 gap-5">
          {HOROSCOPES.map((h) => (
            <Card key={h.title} className="tilt">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[var(--color-brand-gold)]">{h.title}</h3>
                <div className="text-2xl font-semibold text-white">
                  <CountUp to={h.score} duration={1500} />
                </div>
              </div>
              <p className="text-sm text-white/70 leading-relaxed">{h.body}</p>
              <div className="mt-4 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--color-brand-violet)] to-[var(--color-brand-aqua)]"
                  style={{ width: `${h.score}%` }}
                />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
