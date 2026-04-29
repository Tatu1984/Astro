import { redirect } from "next/navigation";
import { Calendar as CalendarIcon } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/backend/database/client";
import { resolveNatal } from "@/backend/services/chart.service";
import {
  buildCalendar,
  findEclipses,
  findMuhurta,
  findRetrogradeWindows,
  TransitError,
  type EclipseEvent,
  type MuhurtaDay,
  type RetrogradeWindow,
  type UpcomingAspect,
} from "@/backend/services/transit.service";
import { MonthGrid } from "@/frontend/components/calendar/MonthGrid";
import { TopBar } from "@/frontend/components/portal/TopBar";
import { Card } from "@/frontend/components/ui/Card";

export const dynamic = "force-dynamic";

function defaultMonthRange(): { fromIso: string; toIso: string } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const from = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  const to = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59));
  return { fromIso: from.toISOString(), toIso: to.toISOString() };
}

const ASPECT_TONE: Record<string, string> = {
  conjunction: "border-white/30 bg-white/5 text-white/80",
  sextile: "border-[var(--color-brand-aqua)]/40 bg-[var(--color-brand-aqua)]/10 text-[var(--color-brand-aqua)]",
  trine: "border-[var(--color-brand-aqua)]/60 bg-[var(--color-brand-aqua)]/15 text-[var(--color-brand-aqua)]",
  square: "border-[var(--color-brand-rose)]/40 bg-[var(--color-brand-rose)]/10 text-[var(--color-brand-rose)]",
  opposition: "border-[var(--color-brand-rose)]/60 bg-[var(--color-brand-rose)]/15 text-[var(--color-brand-rose)]",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function monthKey(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function relativeLabel(days: number): string {
  if (days <= 0.5) return "today";
  if (days <= 1.5) return "tomorrow";
  if (days < 7) return `in ${Math.round(days)} days`;
  if (days < 30) return `in ${Math.round(days / 7)} week${Math.round(days / 7) === 1 ? "" : "s"}`;
  return `in ${Math.round(days / 30)} month${Math.round(days / 30) === 1 ? "" : "s"}`;
}

function groupByMonth(events: UpcomingAspect[]): Array<{ month: string; events: UpcomingAspect[] }> {
  const map = new Map<string, UpcomingAspect[]>();
  for (const e of events) {
    const k = monthKey(e.peakDate);
    const arr = map.get(k) ?? [];
    arr.push(e);
    map.set(k, arr);
  }
  return Array.from(map.entries()).map(([month, events]) => ({ month, events }));
}

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const profile = await prisma.profile.findFirst({
    where: { userId: session.user.id, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, fullName: true, birthDate: true, latitude: true, longitude: true },
  });

  if (!profile) {
    return (
      <>
        <TopBar title="Calendar" subtitle="Upcoming transits to your chart" />
        <div className="p-6 max-w-2xl">
          <Card className="!p-8 text-center">
            <CalendarIcon className="h-8 w-8 mx-auto text-white/40 mb-3" />
            <p className="text-sm text-white/55">Add a birth profile to see upcoming transits to your chart.</p>
          </Card>
        </div>
      </>
    );
  }

  let events: UpcomingAspect[] = [];
  let retrogrades: RetrogradeWindow[] = [];
  let eclipses: EclipseEvent[] = [];
  let muhurtaDays: MuhurtaDay[] = [];
  let calendarError: string | null = null;
  try {
    const { chart } = await resolveNatal({
      userId: session.user.id,
      profileId: profile.id,
      request: {
        birth_datetime_utc: profile.birthDate.toISOString(),
        latitude: Number(profile.latitude),
        longitude: Number(profile.longitude),
        house_system: "PLACIDUS",
        system: "BOTH",
      },
    });
    const [cal, retroWindows, eclipseEvents, muhurta] = await Promise.all([
      buildCalendar({ natal: chart, daysAhead: 60 }),
      findRetrogradeWindows({ daysPast: 30, daysAhead: 90 }).catch(() => [] as RetrogradeWindow[]),
      findEclipses({ daysPast: 14, daysAhead: 120 }).catch(() => [] as EclipseEvent[]),
      findMuhurta({ daysAhead: 30 }).catch(() => [] as MuhurtaDay[]),
    ]);
    events = cal.events;
    retrogrades = retroWindows;
    eclipses = eclipseEvents;
    muhurtaDays = muhurta;
  } catch (err) {
    calendarError = err instanceof Error ? err.message : String(err);
    if (err instanceof TransitError) calendarError = err.message;
  }

  // Top auspicious + warn-about-bad muhurta days
  const topAuspicious = muhurtaDays
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  const worstAvoid = muhurtaDays
    .filter((d) => d.rating === "avoid" || d.rating === "very-avoid")
    .slice()
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  const grouped = groupByMonth(events);
  const { fromIso, toIso } = defaultMonthRange();

  return (
    <>
      <TopBar
        title="Calendar"
        subtitle={`Upcoming transits to ${profile.fullName} · next 60 days · ${events.length} events`}
      />
      <div className="p-6 space-y-5 max-w-5xl">
        <MonthGrid profileId={profile.id} initialFromIso={fromIso} initialToIso={toIso} />

        <p className="text-xs text-white/45">
          Aspect peaks predicted by linear extrapolation from current planet speeds. Retrograde stations may shift dates by a few days; the next pass after a station isn&apos;t included here.
        </p>

        {calendarError ? (
          <div className="rounded-md border border-[var(--color-brand-rose)]/40 bg-[var(--color-brand-rose)]/10 px-4 py-3 text-sm text-white">
            {calendarError}
          </div>
        ) : null}

        {events.length === 0 && !calendarError ? (
          <Card className="!p-8 text-center">
            <p className="text-sm text-white/55">No notable transit aspects coming exact in the next 60 days.</p>
          </Card>
        ) : null}

        {topAuspicious.length ? (
          <Card className="!p-5">
            <h2 className="text-xs uppercase tracking-wider text-[var(--color-brand-gold)] mb-3">Muhurta · auspicious days · next 30</h2>
            <ul className="space-y-2 text-sm mb-3">
              {topAuspicious.map((d, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-center gap-3 rounded-md bg-[var(--color-brand-aqua)]/10 border border-[var(--color-brand-aqua)]/30 px-3 py-2"
                >
                  <span className="font-medium text-white">{fmtDate(d.date)}</span>
                  <span className="text-[10px] text-white/45 uppercase tracking-wider">
                    {d.weekday} · {d.nakshatra} · {d.tithiName}
                  </span>
                  <span className="ml-auto text-[var(--color-brand-aqua)] font-semibold tabular-nums">
                    {d.score}/100
                  </span>
                </li>
              ))}
            </ul>
            {worstAvoid.length ? (
              <>
                <p className="text-[10px] uppercase tracking-wider text-white/40 mt-3 mb-1.5">Avoid for major undertakings</p>
                <ul className="space-y-1 text-xs">
                  {worstAvoid.map((d, i) => (
                    <li
                      key={i}
                      className="flex flex-wrap items-center gap-2 rounded-md bg-[var(--color-brand-rose)]/10 border border-[var(--color-brand-rose)]/30 px-3 py-1.5"
                    >
                      <span className="text-white">{fmtDate(d.date)}</span>
                      <span className="text-[10px] text-white/45">{d.nakshatra} · {d.tithiName}</span>
                      <span className="ml-auto text-[var(--color-brand-rose)] tabular-nums">{d.score}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <p className="text-[10px] text-white/35 mt-3">
              Score weights: nakshatra 50% · tithi 30% · weekday 20%. Use as a quick filter; check a full muhurta calculator for major events.
            </p>
          </Card>
        ) : null}

        {eclipses.length ? (
          <Card accent="gold" className="!p-5">
            <h2 className="text-xs uppercase tracking-wider text-[var(--color-brand-gold)] mb-3">Eclipses · next 4 months</h2>
            <ul className="space-y-2 text-sm">
              {eclipses.map((e, i) => (
                <li
                  key={`${e.kind}-${i}`}
                  className="flex flex-wrap items-center gap-3 rounded-md bg-white/5 border border-white/10 px-3 py-2"
                >
                  <span className="font-medium text-white capitalize">{e.kind} eclipse</span>
                  <span className="text-white/60 text-xs">{fmtDate(e.date)}</span>
                  <span className="text-[10px] text-white/45 uppercase tracking-wider">
                    Sun {e.sunSign} · Moon {e.moonSign} · {e.nodalDistance.toFixed(1)}° from node
                  </span>
                  <span
                    className={
                      e.status === "active"
                        ? "ml-auto rounded-full border border-[var(--color-brand-gold)]/40 bg-[var(--color-brand-gold)]/15 text-[var(--color-brand-gold)] px-2 py-0.5 text-[10px] uppercase tracking-wider"
                        : e.status === "upcoming"
                        ? "ml-auto rounded-full border border-[var(--color-brand-aqua)]/40 bg-[var(--color-brand-aqua)]/10 text-[var(--color-brand-aqua)] px-2 py-0.5 text-[10px] uppercase tracking-wider"
                        : "ml-auto rounded-full border border-white/10 text-white/40 px-2 py-0.5 text-[10px] uppercase tracking-wider"
                    }
                  >
                    {e.status}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {retrogrades.length ? (
          <Card className="!p-5">
            <h2 className="text-xs uppercase tracking-wider text-[var(--color-brand-gold)] mb-3">Retrograde windows · −30 to +90 days</h2>
            <ul className="space-y-2 text-sm">
              {retrogrades.map((r, i) => (
                <li key={`${r.planet}-${i}`} className="flex flex-wrap items-center gap-3 rounded-md bg-white/5 border border-white/10 px-3 py-2">
                  <span className="font-medium text-white">{r.planet} ℞</span>
                  <span className="text-white/60 text-xs">
                    {fmtDate(r.startDate)} → {fmtDate(r.endDate)}
                  </span>
                  <span
                    className={
                      r.status === "active"
                        ? "ml-auto rounded-full border border-[var(--color-brand-gold)]/40 bg-[var(--color-brand-gold)]/15 text-[var(--color-brand-gold)] px-2 py-0.5 text-[10px] uppercase tracking-wider"
                        : r.status === "upcoming"
                        ? "ml-auto rounded-full border border-[var(--color-brand-aqua)]/40 bg-[var(--color-brand-aqua)]/10 text-[var(--color-brand-aqua)] px-2 py-0.5 text-[10px] uppercase tracking-wider"
                        : "ml-auto rounded-full border border-white/10 text-white/40 px-2 py-0.5 text-[10px] uppercase tracking-wider"
                    }
                  >
                    {r.status}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {grouped.map((g) => (
          <section key={g.month} className="space-y-2">
            <h2 className="text-xs uppercase tracking-wider text-[var(--color-brand-gold)]">{g.month}</h2>
            <ul className="space-y-2">
              {g.events.map((e, i) => (
                <li
                  key={`${e.transit}-${e.aspect}-${e.natal}-${i}`}
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 grid sm:grid-cols-[140px_1fr_auto] gap-2 sm:gap-4 items-center"
                >
                  <div className="text-xs">
                    <div className="text-white">{fmtDate(e.peakDate)}</div>
                    <div className="text-white/40 mt-0.5">{relativeLabel(e.daysFromNow)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-white">
                      <strong>{e.transit}</strong>{" "}
                      <span className="text-white/55">{e.aspect}</span>{" "}
                      natal <strong>{e.natal}</strong>
                    </div>
                    <div className="text-[10px] text-white/40 mt-0.5 uppercase tracking-wider">
                      in {e.natalSign} · h{e.natalHouse ?? "—"}
                    </div>
                  </div>
                  <span
                    className={`justify-self-start sm:justify-self-end inline-block rounded-md border px-2 py-0.5 text-[11px] capitalize ${ASPECT_TONE[e.aspect] ?? "border-white/10 text-white/55"}`}
                  >
                    {e.aspect}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
