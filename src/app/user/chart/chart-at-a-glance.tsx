import { Card } from "@/frontend/components/ui/Card";
import { GlossaryTerm } from "@/frontend/components/glossary/GlossaryTerm";
import type { NatalResponse, VedicResponse } from "@/shared/types/chart";

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer",
  "Leo", "Virgo", "Libra", "Scorpio",
  "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

function signFor(longitudeDeg: number): string {
  const norm = ((longitudeDeg % 360) + 360) % 360;
  return SIGNS[Math.floor(norm / 30)];
}

const SIGN_VIBE: Record<string, string> = {
  Aries: "bold, action-first, pioneering",
  Taurus: "grounded, sensual, security-seeking",
  Gemini: "curious, communicative, mentally restless",
  Cancer: "nurturing, emotional, family-rooted",
  Leo: "expressive, generous, attention-loving",
  Virgo: "analytical, helpful, detail-oriented",
  Libra: "harmonious, diplomatic, beauty-seeking",
  Scorpio: "intense, private, transformative",
  Sagittarius: "adventurous, philosophical, freedom-loving",
  Capricorn: "disciplined, ambitious, long-game",
  Aquarius: "independent, intellectual, future-focused",
  Pisces: "intuitive, compassionate, dream-oriented",
};

const PLANET_VIBE: Record<string, string> = {
  Sun: "your essential identity — what drives you at the core",
  Moon: "your emotional self — what feels safe and like home",
  Mercury: "how you think and communicate",
  Venus: "what you love, value, and find beautiful",
  Mars: "how you act, fight, and pursue",
  Jupiter: "where you grow, expand, and find luck",
  Saturn: "where you face limits, build discipline, and earn mastery",
  Rahu: "where you hunger and reach beyond yourself",
  Ketu: "where you let go and detach",
};

export interface ChartAtAGlanceProps {
  chart: NatalResponse;
  vedic: VedicResponse | null;
  vedicError?: string | null;
}

export function ChartAtAGlance({ chart, vedic, vedicError }: ChartAtAGlanceProps) {
  const sun = chart.planets.find((p) => p.name === "Sun");
  const moon = chart.planets.find((p) => p.name === "Moon");

  const ascSign = vedic?.ascendant_sign ?? signFor(chart.ascendant_deg);
  const moonSignVedic = vedic?.planets.find((p) => p.name === "Moon")?.sidereal_sign;
  const moonSign = moonSignVedic ?? (moon ? moon.sign : "—");
  const sunSign = vedic?.planets.find((p) => p.name === "Sun")?.sidereal_sign ?? (sun ? sun.sign : "—");
  const moonNakshatra = vedic?.planets.find((p) => p.name === "Moon")?.nakshatra ?? null;
  const moonPada = vedic?.planets.find((p) => p.name === "Moon")?.pada ?? null;
  const maha = vedic?.dasha?.mahadasha;
  const antar = vedic?.dasha?.antardasha;

  const summary = buildPlainSummary({ ascSign, moonSign, sunSign, mahaLord: maha?.lord });

  return (
    <Card accent="gold" className="!p-6">
      <div className="flex items-baseline justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-brand-gold)]">Your chart at a glance</h2>
          <p className="text-xs text-white/55 mt-0.5">
            The essentials in plain English — hover any term for a full definition.
          </p>
        </div>
        {vedic ? (
          <span className="text-[10px] text-white/40 uppercase tracking-wider">
            Sidereal · {vedic.ayanamsha_name}
          </span>
        ) : null}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <FactRow
          label={
            <>
              <GlossaryTerm term="Lagna">Lagna</GlossaryTerm> /{" "}
              <GlossaryTerm term="Ascendant">Rising sign</GlossaryTerm>
            </>
          }
          value={ascSign}
          plain="how you appear to others — your outward self and first impression"
          flavor={SIGN_VIBE[ascSign]}
        />

        <FactRow
          label={
            <>
              <GlossaryTerm term="Rashi">Rashi</GlossaryTerm> /{" "}
              <GlossaryTerm term="Moon">Moon sign</GlossaryTerm>
            </>
          }
          value={moonSign}
          plain={PLANET_VIBE.Moon}
          flavor={SIGN_VIBE[moonSign]}
        />

        <FactRow
          label={<GlossaryTerm term="Sun">Sun sign</GlossaryTerm>}
          value={sunSign}
          plain={PLANET_VIBE.Sun}
          flavor={SIGN_VIBE[sunSign]}
        />

        {moonNakshatra ? (
          <FactRow
            label={<GlossaryTerm term="Nakshatra">Nakshatra</GlossaryTerm>}
            value={`${moonNakshatra}${moonPada ? ` · pada ${moonPada}` : ""}`}
            plain="the lunar mansion the Moon was in at your birth — adds emotional + karmic flavor on top of your Moon sign"
          />
        ) : null}

        {maha ? (
          <FactRow
            label={
              <>
                Current <GlossaryTerm term="Dasha">Mahadasha</GlossaryTerm>
              </>
            }
            value={maha.lord}
            plain={`your current major life-phase, ruled by ${maha.lord} — ${PLANET_VIBE[maha.lord] ?? "shapes the dominant theme of these years"}`}
            flavor={`${fmtDate(maha.start)} → ${fmtDate(maha.end)}`}
          />
        ) : null}

        {antar && maha ? (
          <FactRow
            label={
              <>
                Current <GlossaryTerm term="Antardasha">Antardasha</GlossaryTerm>
              </>
            }
            value={`${antar.lord} in ${maha.lord}`}
            plain="the sub-period within your Mahadasha — refines what's emphasized right now"
            flavor={`${fmtDate(antar.start)} → ${fmtDate(antar.end)}`}
          />
        ) : null}
      </div>

      {summary ? (
        <p className="mt-5 text-sm text-white/75 leading-relaxed border-t border-white/10 pt-4">
          {summary}
        </p>
      ) : null}

      {vedicError ? (
        <p className="mt-4 text-xs text-[var(--color-brand-rose)]/80 border-t border-[var(--color-brand-rose)]/20 pt-3">
          Vedic compute unavailable: {vedicError}. Showing Western chart only — Nakshatra and Dasha will appear once the compute service responds.
        </p>
      ) : null}
    </Card>
  );
}

function FactRow({
  label,
  value,
  plain,
  flavor,
}: {
  label: React.ReactNode;
  value: string;
  plain: string;
  flavor?: string;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/5 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-white/45">{label}</p>
      <p className="text-base font-semibold text-white mt-0.5">
        <GlossaryTerm term={value}>{value}</GlossaryTerm>
      </p>
      <p className="text-[11px] text-white/55 mt-1 leading-snug">{plain}</p>
      {flavor ? <p className="text-[11px] text-[var(--color-brand-aqua)]/80 mt-0.5 italic">{flavor}</p> : null}
    </div>
  );
}

function buildPlainSummary({
  ascSign,
  moonSign,
  sunSign,
  mahaLord,
}: {
  ascSign: string;
  moonSign: string;
  sunSign: string;
  mahaLord?: string;
}): string | null {
  const ascVibe = SIGN_VIBE[ascSign];
  const moonVibe = SIGN_VIBE[moonSign];
  const sunVibe = SIGN_VIBE[sunSign];
  if (!ascVibe || !moonVibe || !sunVibe) return null;

  const dasha = mahaLord
    ? ` Right now you're in ${mahaLord}'s Mahadasha — a long life-phase shaped by ${PLANET_VIBE[mahaLord] ?? "this planet's themes"}.`
    : "";

  return `You're a ${ascSign} rising (${ascVibe}), with your Moon in ${moonSign} (${moonVibe}) and Sun in ${sunSign} (${sunVibe}).${dasha}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
