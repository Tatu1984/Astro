import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";

import { auth } from "@/auth";
import { prisma } from "@/backend/database/client";
import {
  resolveHoroscope,
  type HoroscopePayload,
  type ResolveHoroscopeKind,
} from "@/backend/services/horoscope.service";
import { TopBar } from "@/frontend/components/portal/TopBar";
import { Card } from "@/frontend/components/ui/Card";

const PERIOD_TABS: Array<{ kind: ResolveHoroscopeKind; label: string }> = [
  { kind: "DAILY", label: "Daily" },
  { kind: "WEEKLY", label: "Weekly" },
  { kind: "MONTHLY", label: "Monthly" },
  { kind: "YEARLY", label: "Yearly" },
];

const KIND_COPY: Record<ResolveHoroscopeKind, { range: (s: Date, e: Date) => string }> = {
  DAILY: {
    range: (s) => s.toUTCString().slice(0, 16),
  },
  WEEKLY: {
    range: (s, e) =>
      `${s.toUTCString().slice(5, 16)} – ${new Date(e.getTime() - 1).toUTCString().slice(5, 16)}`,
  },
  MONTHLY: {
    range: (s) => s.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
  },
  YEARLY: {
    range: (s) => s.toLocaleString("en-US", { year: "numeric", timeZone: "UTC" }),
  },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const periodParam = (params.period ?? "DAILY").toUpperCase() as ResolveHoroscopeKind;
  const activeKind: ResolveHoroscopeKind =
    PERIOD_TABS.find((t) => t.kind === periodParam)?.kind ?? "DAILY";

  const profile = await prisma.profile.findFirst({
    where: { userId: session.user.id, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, fullName: true, birthPlace: true },
  });

  let payload: HoroscopePayload | null = null;
  let provider: string | null = null;
  let periodStart: Date | null = null;
  let periodEnd: Date | null = null;
  let factsSummary: string[] = [];
  let errorMsg: string | null = null;

  if (profile) {
    try {
      const result = await resolveHoroscope({
        userId: session.user.id,
        profileId: profile.id,
        kind: activeKind,
      });
      payload = result.payload;
      provider = `${result.prediction.llmProvider} · ${result.prediction.llmModel}${
        result.cached ? " · cached" : ""
      }`;
      periodStart = result.prediction.periodStart;
      periodEnd = result.prediction.periodEnd;

      const facts = result.prediction.facts as Record<string, unknown> | null;
      if (facts && typeof facts === "object") {
        const asc = (facts as { ascendant?: { sign?: string; degree?: number } }).ascendant;
        const mc = (facts as { midheaven?: { sign?: string; degree?: number } }).midheaven;
        const planets = (facts as { planets?: Array<{ name?: string; sign?: string; house?: number | null; retrograde?: boolean }> }).planets;
        if (asc?.sign) factsSummary.push(`Ascendant in ${asc.sign}`);
        if (mc?.sign) factsSummary.push(`Midheaven in ${mc.sign}`);
        if (Array.isArray(planets)) {
          for (const p of planets.slice(0, 6)) {
            if (!p?.name || !p?.sign) continue;
            const house = p.house ? `, h${p.house}` : "";
            const retro = p.retrograde ? " ℞" : "";
            factsSummary.push(`${p.name} in ${p.sign}${house}${retro}`);
          }
        }
      }
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : String(err);
    }
  }

  return (
    <>
      <TopBar
        title="Predictions"
        subtitle={profile ? `${profile.fullName} · ${profile.birthPlace}` : "Add a birth profile to get started"}
      />
      <div className="p-6 space-y-6 max-w-5xl">
        <div className="flex items-center gap-1 rounded-md bg-[var(--color-card)] border border-[var(--color-border)] p-1 w-fit">
          {PERIOD_TABS.map((t) => (
            <Link
              key={t.kind}
              href={`/user/predictions?period=${t.kind}`}
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

        {!profile ? (
          <Card>
            <p className="text-white/70 text-sm">
              Add your birth profile to receive personalised predictions.{" "}
              <Link href="/user/profile" className="text-[var(--color-brand-aqua)] underline">
                Go to profile
              </Link>
              .
            </p>
          </Card>
        ) : errorMsg ? (
          <Card>
            <h3 className="font-semibold text-[var(--color-brand-rose)] text-sm mb-1">
              Could not load this prediction
            </h3>
            <p className="text-white/70 text-sm">{errorMsg}</p>
          </Card>
        ) : !payload ? (
          <Card>
            <p className="text-white/60 text-sm">Computing your reading…</p>
          </Card>
        ) : (
          <>
            <Card accent="gold" className="space-y-2">
              <p className="text-[10px] text-white/40 uppercase tracking-wider">
                {periodStart && periodEnd ? KIND_COPY[activeKind].range(periodStart, periodEnd) : ""}
              </p>
              <h2 className="text-2xl font-semibold text-white">{payload.headline}</h2>
              <p className="text-white/75 leading-relaxed whitespace-pre-line">{payload.body}</p>
              {provider ? (
                <div className="flex items-center gap-1.5 pt-2 text-[10px] text-white/40 uppercase tracking-wider">
                  <Sparkles className="h-3 w-3" />
                  {provider}
                </div>
              ) : null}
            </Card>

            <div className="grid md:grid-cols-3 gap-5">
              {(["career", "love", "health"] as const).map((domain) => {
                const d = payload!.domains[domain];
                const title = domain.charAt(0).toUpperCase() + domain.slice(1);
                return (
                  <Card key={domain}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-[var(--color-brand-gold)]">{title}</h3>
                      <span className="text-2xl font-semibold text-white">{d.score}</span>
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

            {factsSummary.length ? (
              <Card>
                <h3 className="text-sm font-semibold text-[var(--color-brand-aqua)] mb-2">
                  Driving factors
                </h3>
                <ul className="text-sm text-white/70 space-y-1 list-disc pl-5">
                  {factsSummary.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
