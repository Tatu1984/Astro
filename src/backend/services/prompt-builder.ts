import type { NatalResponse } from "@/shared/types/chart";

export type HoroscopeKind = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export interface HoroscopeFacts {
  profile: {
    name: string;
    birthDateLocal: string;
    birthPlace: string;
    timezone: string;
  };
  kind: HoroscopeKind;
  periodLabel: string;
  periodStartLocal: string;
  periodEndLocal: string;
  ascendant: { sign: string; degree: number };
  midheaven: { sign: string; degree: number };
  planets: Array<{
    name: string;
    sign: string;
    longitude: number;
    house: number | null;
    retrograde: boolean;
  }>;
}

export interface HoroscopePromptResult {
  systemPrompt: string;
  userPrompt: string;
  facts: HoroscopeFacts;
}

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer",
  "Leo", "Virgo", "Libra", "Scorpio",
  "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

function signFor(longitude: number): string {
  const norm = ((longitude % 360) + 360) % 360;
  return SIGNS[Math.floor(norm / 30)];
}

const KIND_GUIDANCE: Record<HoroscopeKind, { period: string; horizon: string; bodyTone: string }> = {
  DAILY: {
    period: "today",
    horizon: "the day ahead",
    bodyTone: "specific to one day; one paragraph (3–5 sentences) connecting two or three placements to today's themes",
  },
  WEEKLY: {
    period: "this week",
    horizon: "the next seven days",
    bodyTone: "a one-paragraph weekly outlook (4–6 sentences) noting how energies shift across the week",
  },
  MONTHLY: {
    period: "this month",
    horizon: "the next thirty days",
    bodyTone: "two short paragraphs (5–8 sentences total) covering broad monthly themes plus one notable life-area focus",
  },
  YEARLY: {
    period: "this year",
    horizon: "the next twelve months",
    bodyTone: "two to three paragraphs (8–12 sentences) covering year themes, two life-area highlights, and one phrase of grounded encouragement",
  },
};

export function buildHoroscopePrompt(args: {
  kind: HoroscopeKind;
  fullName: string;
  birthDateUtc: Date;
  birthPlace: string;
  timezone: string;
  chart: NatalResponse;
  periodStart: Date;
  periodEnd: Date;
}): HoroscopePromptResult {
  const dateFmt = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: args.timezone,
  });
  const labelFmt = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: args.timezone,
  });

  const guidance = KIND_GUIDANCE[args.kind];

  const facts: HoroscopeFacts = {
    profile: {
      name: args.fullName,
      birthDateLocal: dateFmt.format(args.birthDateUtc),
      birthPlace: args.birthPlace,
      timezone: args.timezone,
    },
    kind: args.kind,
    periodLabel: guidance.period,
    periodStartLocal: labelFmt.format(args.periodStart),
    periodEndLocal: labelFmt.format(new Date(args.periodEnd.getTime() - 1)),
    ascendant: {
      sign: signFor(args.chart.ascendant_deg),
      degree: Number((args.chart.ascendant_deg % 30).toFixed(2)),
    },
    midheaven: {
      sign: signFor(args.chart.midheaven_deg),
      degree: Number((args.chart.midheaven_deg % 30).toFixed(2)),
    },
    planets: args.chart.planets.map((p) => ({
      name: p.name,
      sign: p.sign,
      longitude: Number(p.longitude_deg.toFixed(2)),
      house: p.house,
      retrograde: p.speed_deg_per_day < 0,
    })),
  };

  const systemPrompt = `You are a thoughtful, modern astrologer. You write ${args.kind.toLowerCase()} readings that are encouraging, specific, and grounded in the chart data given. Rules:

- When you mention any astrological term — planet name in a sign, aspect (conjunction/opposition/square/trine/sextile/quincunx), house number, retrograde, ingress, station, dasha, nakshatra, dosha, yoga, dignity — immediately follow it with a 5–10 word plain-English clarification wrapped in markdown italics. Example: "Saturn aspects your Mars *(a phase where discipline weighs on your drive)*." Do not redefine a term twice in the same response. Write for someone who has never read an astrology book; the technical term anchors authority, the explanation makes it actionable. Daily, weekly, and monthly horoscopes are the user's primary daily reading — make sure they're scannable in under 60 seconds.
- Treat the chart JSON below as ground truth. Do NOT invent or contradict planet positions, signs, or houses.
- Output VALID JSON matching the schema exactly. No prose outside the JSON. Italic clarifications go inside the JSON string fields.
- Tone: warm, practical, modern English. Avoid clichés like "The cosmos has aligned"; speak as a wise friend.
- The body should be ${guidance.bodyTone}.
- The headline is short (≤ 60 chars) and concrete.
- Each domain (career, love, health) gets a 2–3 sentence body and an integer score 1–100 for how favourable ${guidance.period} is for that area.
- This is a Phase 2 reading derived from the natal chart only. Real transit/dasha grounding lands in Phase 3 — keep claims about ${guidance.horizon} general about the natal energies, not specific to transits you don't have data for.
`;

  const schema = `{
  "headline": string (≤ 60 chars),
  "body": string,
  "domains": {
    "career": { "score": integer 1-100, "body": string },
    "love":   { "score": integer 1-100, "body": string },
    "health": { "score": integer 1-100, "body": string }
  }
}`;

  const userPrompt = `Subject: ${args.kind.toLowerCase()} horoscope for ${facts.profile.name}.
Period (in their timezone): ${facts.periodStartLocal} → ${facts.periodEndLocal}.

Chart JSON (ground truth):
${JSON.stringify(facts, null, 2)}

Respond as JSON in exactly this shape:
${schema}
`;

  return { systemPrompt, userPrompt, facts };
}
