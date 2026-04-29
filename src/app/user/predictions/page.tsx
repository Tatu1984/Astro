import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/backend/database/client";
import {
  lookupCachedHoroscope,
  type HoroscopeDisplayFact,
  type HoroscopePayload,
  type ResolveHoroscopeKind,
} from "@/backend/services/horoscope.service";
import { TopBar } from "@/frontend/components/portal/TopBar";
import { Card } from "@/frontend/components/ui/Card";

import { PredictionBody } from "./prediction-body";
import { StreamingPrediction } from "./streaming-prediction";

const PRIMARY_TABS: Array<{ kind: ResolveHoroscopeKind; label: string }> = [
  { kind: "DAILY", label: "Daily" },
  { kind: "WEEKLY", label: "Weekly" },
  { kind: "MONTHLY", label: "Monthly" },
];
const SECONDARY_TABS: Array<{ kind: ResolveHoroscopeKind; label: string }> = [
  { kind: "YEARLY", label: "Yearly" },
];
const ALL_TABS = [...PRIMARY_TABS, ...SECONDARY_TABS];

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
    ALL_TABS.find((t) => t.kind === periodParam)?.kind ?? "DAILY";

  const profile = await prisma.profile.findFirst({
    where: { userId: session.user.id, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, fullName: true, birthPlace: true },
  });

  let payload: HoroscopePayload | null = null;
  let provider: string | null = null;
  let periodStart: Date | null = null;
  let periodEnd: Date | null = null;
  let displayFacts: HoroscopeDisplayFact[] = [];
  let errorMsg: string | null = null;
  let needsStream = false;

  if (profile) {
    try {
      const cached = await lookupCachedHoroscope({
        userId: session.user.id,
        profileId: profile.id,
        kind: activeKind,
      });
      if (cached) {
        payload = cached.payload;
        provider = `${cached.prediction.llmProvider} · ${cached.prediction.llmModel} · cached`;
        periodStart = cached.prediction.periodStart;
        periodEnd = cached.prediction.periodEnd;
        displayFacts = cached.displayFacts;
      } else {
        needsStream = true;
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
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-md bg-[var(--color-card)] border border-[var(--color-border)] p-1 w-fit">
            {PRIMARY_TABS.map((t) => (
              <Link
                key={t.kind}
                href={`/user/predictions?period=${t.kind}`}
                className={
                  activeKind === t.kind
                    ? "px-5 py-2 text-sm font-semibold rounded bg-[var(--color-brand-violet)] text-white"
                    : "px-5 py-2 text-sm rounded text-white/60 hover:text-white hover:bg-white/5"
                }
              >
                {t.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {SECONDARY_TABS.map((t) => (
              <Link
                key={t.kind}
                href={`/user/predictions?period=${t.kind}`}
                className={
                  activeKind === t.kind
                    ? "px-3 py-1 text-[11px] font-medium rounded-full bg-white/10 text-white border border-white/20"
                    : "px-3 py-1 text-[11px] rounded-full text-white/50 hover:text-white border border-white/10 hover:border-white/30"
                }
              >
                {t.label}
              </Link>
            ))}
          </div>
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
        ) : needsStream && profile ? (
          <StreamingPrediction
            kind={activeKind}
            profileId={profile.id}
            rangeLabelFor={(s, e) => KIND_COPY[activeKind].range(s, e)}
          />
        ) : !payload ? (
          <Card>
            <p className="text-white/60 text-sm">Computing your reading…</p>
          </Card>
        ) : (
          <PredictionBody
            headline={payload.headline}
            body={payload.body}
            domains={payload.domains}
            displayFacts={displayFacts}
            rangeLabel={periodStart && periodEnd ? KIND_COPY[activeKind].range(periodStart, periodEnd) : ""}
            provider={provider}
          />
        )}
      </div>
    </>
  );
}
