import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";

import { auth } from "@/auth";
import { resolveNatal } from "@/backend/services/chart.service";
import { listUserProfiles } from "@/backend/services/profile.service";
import { resolveVedic } from "@/backend/services/vedic.service";
import { ChartWheel } from "@/frontend/components/astro/ChartWheel";
import { TopBar } from "@/frontend/components/portal/TopBar";
import { Badge } from "@/frontend/components/ui/Badge";
import { Button } from "@/frontend/components/ui/Button";
import { Card } from "@/frontend/components/ui/Card";
import type { VedicResponse } from "@/shared/types/chart";

import { ProfileSwitcher } from "./profile-switcher";

function fmtPlace(birthPlace: string) {
  // first segment usually most informative; full string can be long
  return birthPlace.split(",").slice(0, 2).join(",").trim();
}

export default async function ChartWorkspace({
  searchParams,
}: {
  searchParams: Promise<{ profile?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const profiles = await listUserProfiles(session.user.id);

  if (profiles.length === 0) {
    return (
      <>
        <TopBar title="Chart" subtitle="No profiles yet" right={<EmptyAddButton />} />
        <div className="p-6">
          <Card className="!p-10 text-center max-w-2xl">
            <h2 className="text-xl font-semibold text-white">No birth profile yet</h2>
            <p className="mt-2 text-sm text-white/60 max-w-md mx-auto">
              Add your birth date, time and place — your natal chart computes automatically.
            </p>
            <div className="mt-6 flex justify-center">
              <Link href="/user/profile">
                <Button variant="gold" size="md">
                  <Plus className="h-4 w-4" /> Add a birth profile
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </>
    );
  }

  const params = await searchParams;
  const active = profiles.find((p) => p.id === params.profile) ?? profiles[0];

  let chart: Awaited<ReturnType<typeof resolveNatal>>["chart"] | null = null;
  let chartError: string | null = null;
  let vedic: VedicResponse | null = null;
  try {
    const [natal, vedicResult] = await Promise.all([
      resolveNatal({
        userId: session.user.id,
        profileId: active.id,
        request: {
          birth_datetime_utc: active.birthDate.toISOString(),
          latitude: Number(active.latitude),
          longitude: Number(active.longitude),
          house_system: "PLACIDUS",
          system: "BOTH",
        },
      }),
      resolveVedic({ userId: session.user.id, profileId: active.id }).catch(() => null),
    ]);
    chart = natal.chart;
    vedic = vedicResult;
  } catch (err) {
    chartError = err instanceof Error ? err.message : String(err);
  }

  const ascSign = chart ? signFor(chart.ascendant_deg) : "—";
  const initials = active.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <>
      <TopBar
        title={`${active.fullName} · Natal`}
        subtitle={`${fmtPlace(active.birthPlace)} · Placidus houses · Tropical`}
        right={
          <div className="flex items-center gap-2">
            <Badge tone="violet">D1</Badge>
            <ProfileSwitcher
              profiles={profiles.map((p) => ({ id: p.id, fullName: p.fullName }))}
              activeId={active.id}
            />
          </div>
        }
        initials={initials}
      />
      <div className="p-6 space-y-6">
        {chartError ? (
          <div className="rounded-md border border-[var(--color-brand-rose)]/40 bg-[var(--color-brand-rose)]/10 px-4 py-3 text-sm text-white">
            Chart compute error: {chartError}
          </div>
        ) : null}

        {/* Vedic panel — present only when sidereal compute succeeded */}
        {vedic ? <VedicPanel vedic={vedic} /> : null}

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          {/* wheel + axes */}
          <div className="space-y-6">
            <Card accent="gold" className="grid place-items-center !py-10">
              <ChartWheel size={420} chart={chart} />
            </Card>

            {chart ? (
              <Card>
                <h3 className="font-semibold text-[var(--color-brand-gold)] mb-3">Axes &amp; cusps</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <Axis label="Ascendant" deg={chart.ascendant_deg} />
                  <Axis label="Midheaven (MC)" deg={chart.midheaven_deg} />
                  <Axis label="Descendant" deg={(chart.ascendant_deg + 180) % 360} />
                  <Axis label="IC" deg={(chart.midheaven_deg + 180) % 360} />
                </div>
                <div className="mt-5">
                  <p className="text-xs uppercase tracking-wider text-white/40 mb-2">House cusps</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs">
                    {chart.houses.map((h, i) => (
                      <div
                        key={i}
                        className="rounded border border-[var(--color-border)] bg-white/5 px-2 py-1.5 text-white/75"
                      >
                        <span className="text-white/45 mr-1">H{i + 1}</span>
                        {h.toFixed(2)}° {signFor(h)}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ) : null}
          </div>

          {/* planet table + actions */}
          <div className="space-y-6">
            <Card>
              <h3 className="font-semibold text-[var(--color-brand-gold)] mb-3">Planets</h3>
              {chart ? (
                <ul className="text-sm divide-y divide-[var(--color-border)]">
                  {chart.planets.map((p) => {
                    const retro = p.speed_deg_per_day < 0;
                    const degInSign = p.longitude_deg % 30;
                    return (
                      <li key={p.name} className="flex items-center justify-between py-2.5 gap-2">
                        <div className="flex flex-col">
                          <span className="text-white">{p.name}</span>
                          <span className="text-[10px] text-white/40 uppercase tracking-wider">
                            H{p.house ?? "—"}{retro ? " · R" : ""}
                          </span>
                        </div>
                        <span className="text-white/65 text-xs tabular-nums text-right">
                          {p.sign}<br/>
                          <span className="text-white/45">{degInSign.toFixed(2)}°</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-white/55">Couldn&apos;t compute the chart. {chartError}</p>
              )}
              <p className="mt-3 text-[10px] text-white/35">
                Asc: {ascSign} {(chart?.ascendant_deg ?? 0 % 30).toFixed(2)}° · cached by inputHash{" "}
                {chart?.input_hash.slice(0, 10)}…
              </p>
            </Card>

            <Card accent="violet">
              <h3 className="font-semibold text-[var(--color-brand-gold)] mb-2">Vimshottari Dasha</h3>
              <p className="text-xs text-white/55">
                Vedic dasha periods compute in Phase 2 alongside Kerykeion / Jyotisha integration.
              </p>
            </Card>

            <Button variant="gold" className="w-full" disabled title="Available in Phase 2">
              <Sparkles className="h-4 w-4" /> AI · Explain my chart
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer",
  "Leo", "Virgo", "Libra", "Scorpio",
  "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

function signFor(longitudeDeg: number): string {
  const norm = ((longitudeDeg % 360) + 360) % 360;
  return SIGNS[Math.floor(norm / 30)];
}

function Axis({ label, deg }: { label: string; deg: number }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
      <p className="text-sm text-white/85 tabular-nums">{deg.toFixed(2)}°</p>
      <p className="text-[10px] text-white/45">{signFor(deg)}</p>
    </div>
  );
}

function EmptyAddButton() {
  return (
    <Link href="/user/profile">
      <Button variant="gold" size="sm">
        <Plus className="h-4 w-4" /> Add profile
      </Button>
    </Link>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtPeriod(p: { start: string; end: string }): string {
  return `${fmtDate(p.start)} → ${fmtDate(p.end)}`;
}

function VedicPanel({ vedic }: { vedic: VedicResponse }) {
  const m = vedic.dasha.mahadasha;
  const a = vedic.dasha.antardasha;
  return (
    <Card className="!p-5">
      <div className="flex items-start justify-between mb-3 gap-3">
        <div>
          <h3 className="font-semibold text-[var(--color-brand-gold)] text-sm">
            Vedic · sidereal &nbsp;
            <span className="text-[10px] text-white/40 uppercase tracking-wider">
              {vedic.ayanamsha_name} · ayanamsha {vedic.ayanamsha_deg.toFixed(3)}°
            </span>
          </h3>
          <p className="text-xs text-white/55 mt-1">
            Lagna: <strong className="text-white">{vedic.ascendant_sign}</strong>{" "}
            {(vedic.sidereal_ascendant % 30).toFixed(2)}° · D9 sign per planet listed below.
          </p>
        </div>
        <span
          className={
            vedic.is_manglik
              ? "rounded-md border border-[var(--color-brand-rose)]/40 bg-[var(--color-brand-rose)]/10 text-[var(--color-brand-rose)] px-2 py-0.5 text-[10px] uppercase tracking-wider"
              : "rounded-md border border-[var(--color-brand-aqua)]/40 bg-[var(--color-brand-aqua)]/10 text-[var(--color-brand-aqua)] px-2 py-0.5 text-[10px] uppercase tracking-wider"
          }
          title={vedic.manglik_reason}
        >
          {vedic.is_manglik ? "Manglik" : "Non-manglik"}
        </span>
      </div>

      {/* Dasha block */}
      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <div className="rounded-md bg-white/5 border border-white/10 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-white/45">Mahadasha</p>
          <p className="text-base font-semibold text-white mt-0.5">{m.lord}</p>
          <p className="text-[10px] text-white/45 mt-0.5">{fmtPeriod(m)}</p>
        </div>
        <div className="rounded-md bg-white/5 border border-white/10 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-white/45">Current antardasha</p>
          <p className="text-base font-semibold text-white mt-0.5">
            {a.lord} <span className="text-white/45 text-sm">in {m.lord}</span>
          </p>
          <p className="text-[10px] text-white/45 mt-0.5">{fmtPeriod(a)}</p>
        </div>
      </div>

      {/* Upcoming mahadashas */}
      {vedic.dasha.upcoming_mahadashas.length ? (
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-wider text-white/45 mb-1.5">Next mahadashas</p>
          <ul className="flex flex-wrap gap-2 text-xs">
            {vedic.dasha.upcoming_mahadashas.map((u, i) => (
              <li
                key={i}
                className="rounded-md border border-[var(--color-border)] bg-white/5 px-2 py-1 text-white/75"
              >
                <span className="text-white">{u.lord}</span>{" "}
                <span className="text-white/45">· starts {fmtDate(u.start)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Planet table — sidereal */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-white/45 mb-1.5">Planets · sidereal · with nakshatra and D9 sign</p>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
          {vedic.planets.map((p) => (
            <li
              key={p.name}
              className="rounded-md border border-[var(--color-border)] bg-white/5 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-white">{p.name}</span>
                <span className="text-white/55">{p.sidereal_sign}</span>
              </div>
              <div className="text-[10px] text-white/45 mt-0.5 uppercase tracking-wider">
                h{p.house ?? "—"} · {p.nakshatra} pada {p.pada}{p.retrograde ? " · R" : ""}
              </div>
              <div className="text-[10px] text-white/45 mt-0.5">D9: <span className="text-white/75">{p.navamsa_sign}</span></div>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
