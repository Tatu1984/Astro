import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Calendar, Flame, Sparkles, TrendingUp } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/backend/database/client";
import { resolveNatal } from "@/backend/services/chart.service";
import {
  resolveHoroscope,
  type HoroscopePayload,
  type ResolveHoroscopeKind,
} from "@/backend/services/horoscope.service";
import { resolveNowTransits, type TransitAspect } from "@/backend/services/transit.service";
import { ChartWheel } from "@/frontend/components/astro/ChartWheel";
import { Aurora } from "@/frontend/components/effects/Aurora";
import { CountUp } from "@/frontend/components/effects/CountUp";
import { TopBar } from "@/frontend/components/portal/TopBar";
import { Badge } from "@/frontend/components/ui/Badge";
import { Button } from "@/frontend/components/ui/Button";
import { Card } from "@/frontend/components/ui/Card";
import type { NatalResponse } from "@/shared/types/chart";

const TILES = [
  { icon: TrendingUp, title: "Vimshottari Dasha", body: "Sample · live data in Phase 3", tone: "violet" as const },
  { icon: Calendar,   title: "Next big transit",  body: "Live transit forecasts in Phase 3", tone: "gold"   as const },
  { icon: Flame,      title: "Reading streak",    body: "Streak tracking with Phase 2.5",  tone: "rose"   as const },
];

const FALLBACK_DOMAINS: HoroscopePayload["domains"] = {
  career: { score: 70, body: "Live AI horoscope appears here once GEMINI_API_KEY is set." },
  love:   { score: 70, body: "Live AI horoscope appears here once GEMINI_API_KEY is set." },
  health: { score: 70, body: "Live AI horoscope appears here once GEMINI_API_KEY is set." },
};

const PERIOD_TABS: Array<{ kind: ResolveHoroscopeKind; label: string }> = [
  { kind: "DAILY", label: "Daily" },
  { kind: "WEEKLY", label: "Weekly" },
  { kind: "MONTHLY", label: "Monthly" },
  { kind: "YEARLY", label: "Yearly" },
];

function initialsFor(input: string | null | undefined): string {
  if (!input) return "U";
  const parts = input.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "U").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}

export default async function UserToday({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const periodParam = (params.period ?? "DAILY").toUpperCase() as ResolveHoroscopeKind;
  const activeKind: ResolveHoroscopeKind = (PERIOD_TABS.find((t) => t.kind === periodParam)?.kind) ?? "DAILY";

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
  let horoscope: HoroscopePayload | null = null;
  let horoscopeError: string | null = null;
  let horoscopeProvider: string | null = null;
  let transitAspects: TransitAspect[] = [];

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

    if (chart) {
      try {
        const result = await resolveHoroscope({
          userId: user.id,
          profileId: profile.id,
          kind: activeKind,
        });
        horoscope = result.payload;
        horoscopeProvider = `${result.prediction.llmProvider} · ${result.prediction.llmModel}${result.cached ? " · cached" : ""}`;
      } catch (err) {
        horoscopeError = err instanceof Error ? err.message : String(err);
      }

      // Live transit aspects to natal — pure ephemeris call, no LLM cost.
      // Failures are silent; the panel just hides if Render is asleep.
      try {
        const t = await resolveNowTransits({ natal: chart, topN: 6 });
        transitAspects = t.topAspects;
      } catch {
        transitAspects = [];
      }
    }
  }

  const sun = chart?.planets.find((p) => p.name === "Sun");
  const fallbackHero = sun
    ? `Sun in ${sun.sign} · ${sun.longitude_deg.toFixed(2)}°`
    : profile
    ? "Computing your reading…"
    : "Add a profile to compute your chart";

  const heroHeadline = horoscope?.headline ?? fallbackHero;
  const heroBody =
    horoscope?.body ??
    (horoscopeError
      ? `Daily AI horoscope unavailable: ${horoscopeError}. Once GEMINI_API_KEY is set, this updates automatically.`
      : profile
      ? "Once your birth profile is set, this panel reflects today's reading from your real natal chart."
      : "Add your birth profile to see today's personalised reading.");

  const domains = horoscope?.domains ?? FALLBACK_DOMAINS;

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
              <ChartWheel size={240} chart={chart} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-white/40">
                Today · {new Date().toUTCString().slice(5, 11)}
              </p>
              <h2 className="mt-1 text-3xl font-semibold text-white">{heroHeadline}</h2>
              <p className="mt-3 text-white/70 leading-relaxed max-w-md">{heroBody}</p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button variant="gold">
                  Read full reading <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline">Share card</Button>
                {horoscopeProvider ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] text-white/40 uppercase tracking-wider">
                    <Sparkles className="h-3 w-3" />
                    {horoscopeProvider}
                  </span>
                ) : null}
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

        {/* Now: live transit aspects — instant, no LLM cost */}
        {transitAspects.length ? (
          <Card className="!p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-[var(--color-brand-gold)] text-sm">Now · transits to your chart</h3>
                <p className="text-[10px] text-white/40 mt-0.5 uppercase tracking-wider">
                  Live ephemeris · no LLM call
                </p>
              </div>
              <span className="text-[10px] text-white/40 uppercase tracking-wider">{new Date().toUTCString().slice(5, 22)}</span>
            </div>
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
              {transitAspects.map((a, i) => (
                <li
                  key={i}
                  className="rounded-md border border-[var(--color-border)] bg-white/5 px-3 py-2"
                >
                  <div className="text-white">
                    {a.transit} <span className="text-white/45">{a.aspect}</span> natal {a.natal}
                  </div>
                  <div className="text-[10px] text-white/45 uppercase tracking-wider">
                    in {a.natalSign} · h{a.natalHouse ?? "—"} · orb {a.delta.toFixed(1)}°{a.applying ? " · applying" : ""}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {/* tabs — each one fetches a different cached Prediction */}
        <div className="flex items-center gap-1 rounded-md bg-[var(--color-card)] border border-[var(--color-border)] p-1 w-fit">
          {PERIOD_TABS.map((t) => (
            <Link
              key={t.kind}
              href={`/user?period=${t.kind}`}
              className={
                activeKind === t.kind
                  ? "px-4 py-1.5 text-xs font-semibold rounded bg-[var(--color-brand-violet)] text-white"
                  : "px-4 py-1.5 text-xs rounded text-white/60 hover:text-white hover:bg-white/5"
              }
            >
              {t.label}
            </Link>
          ))}
        </div>

        {/* AI domain readings — career / love / health */}
        <div className="grid md:grid-cols-3 gap-5">
          {(["career", "love", "health"] as const).map((domain) => {
            const d = domains[domain];
            const title = domain.charAt(0).toUpperCase() + domain.slice(1);
            return (
              <Card key={domain} className="tilt">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[var(--color-brand-gold)]">{title}</h3>
                  <div className="text-2xl font-semibold text-white">
                    <CountUp to={d.score} duration={1500} />
                  </div>
                </div>
                <p className="text-sm text-white/70 leading-relaxed">{d.body}</p>
                <div className="mt-4 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--color-brand-violet)] to-[var(--color-brand-aqua)]"
                    style={{ width: `${d.score}%` }}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
