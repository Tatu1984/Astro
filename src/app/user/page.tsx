import { redirect } from "next/navigation";
import { ArrowRight, Calendar, Flame, TrendingUp } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/backend/database/client";
import { resolveNatal } from "@/backend/services/chart.service";
import { ChartWheel } from "@/frontend/components/astro/ChartWheel";
import { Aurora } from "@/frontend/components/effects/Aurora";
import { CountUp } from "@/frontend/components/effects/CountUp";
import { TopBar } from "@/frontend/components/portal/TopBar";
import { Badge } from "@/frontend/components/ui/Badge";
import { Button } from "@/frontend/components/ui/Button";
import { Card } from "@/frontend/components/ui/Card";
import type { NatalResponse } from "@/shared/types/chart";

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

function initialsFor(input: string | null | undefined): string {
  if (!input) return "U";
  const parts = input.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "U").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}

export default async function UserToday() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      profiles: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  if (!user) redirect("/login");

  const profile = user.profiles[0];
  let chart: NatalResponse | null = null;
  let chartError: string | null = null;

  if (profile) {
    try {
      const result = await resolveNatal({
        userId: user.id,
        profileId: profile.id,
        request: {
          birth_datetime_utc: profile.birthDate.toISOString(),
          latitude: Number(profile.latitude),
          longitude: Number(profile.longitude),
          house_system: "PLACIDUS",
          system: "BOTH",
        },
      });
      chart = result.chart;
    } catch (err) {
      chartError = err instanceof Error ? err.message : String(err);
    }
  }

  const sun = chart?.planets.find((p) => p.name === "Sun");
  const moon = chart?.planets.find((p) => p.name === "Moon");
  const heroLine = sun
    ? `Sun in ${sun.sign} · ${sun.longitude_deg.toFixed(2)}°`
    : "Connect a profile to compute your chart";
  const heroBody = chart && moon
    ? `Moon in ${moon.sign}, house ${moon.house ?? "—"}. A flowing day for ${
        moon.sign === "Cancer" || moon.sign === "Pisces" ? "emotional reflection" : "decisive action"
      } — let your strengths lead.`
    : "Once your birth profile is set, this panel reflects today's transits over your real natal chart.";

  return (
    <>
      <TopBar
        title={user.name ? `Welcome, ${user.name}` : "Welcome"}
        subtitle={profile ? `${profile.fullName} · ${profile.birthPlace}` : user.email ?? ""}
        right={<Badge tone="aqua">● Online</Badge>}
        initials={initialsFor(user.name ?? user.email)}
      />
      <div className="p-6 space-y-6">
        {chartError ? (
          <div className="rounded-md border border-[var(--color-brand-rose)]/40 bg-[var(--color-brand-rose)]/10 px-4 py-3 text-sm text-[var(--color-ink)]">
            Chart compute error: {chartError}
          </div>
        ) : null}

        {/* hero */}
        <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <Aurora />
          <div className="relative z-10 grid lg:grid-cols-[280px_1fr_280px] gap-6 items-center p-7">
            <div className="grid place-items-center">
              <ChartWheel size={240} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-white/40">Today · {new Date().toUTCString().slice(5, 11)}</p>
              <h2 className="mt-1 text-3xl font-semibold text-white">{heroLine}</h2>
              <p className="mt-3 text-white/70 leading-relaxed max-w-md">{heroBody}</p>
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

        {/* Real chart data */}
        {chart ? (
          <Card className="!p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-[var(--color-brand-gold)] text-base">Your natal chart</h3>
                <p className="text-xs text-white/50 mt-0.5">
                  {chart.house_system} · {chart.system} · cached by inputHash {chart.input_hash.slice(0, 10)}…
                </p>
              </div>
              <div className="text-right text-xs text-white/50">
                <div>Asc {chart.ascendant_deg.toFixed(2)}°</div>
                <div>MC {chart.midheaven_deg.toFixed(2)}°</div>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {chart.planets.map((p) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between rounded-md bg-white/5 border border-white/10 px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-medium text-white">{p.name}</div>
                    <div className="text-xs text-white/50">{p.sign}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-white/80">{p.longitude_deg.toFixed(2)}°</div>
                    <div className="text-[10px] text-white/40 uppercase tracking-wider">
                      h{p.house ?? "—"} · {p.speed_deg_per_day < 0 ? "R" : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

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
