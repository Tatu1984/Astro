import type { NatalResponse } from "@/shared/types/chart";

export interface DailyHoroscopeFacts {
  profile: {
    name: string;
    birthDateLocal: string; // ISO YYYY-MM-DD in profile tz
    birthPlace: string;
    timezone: string;
  };
  date: string; // YYYY-MM-DD in profile tz
  weekday: string;
  ascendant: { sign: string; degree: number };
  midheaven: { sign: string; degree: number };
  planets: Array<{ name: string; sign: string; longitude: number; house: number | null; retrograde: boolean }>;
}

export interface DailyHoroscopePromptResult {
  systemPrompt: string;
  userPrompt: string;
  facts: DailyHoroscopeFacts;
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

export function buildDailyHoroscopePrompt(args: {
  fullName: string;
  birthDateUtc: Date;
  birthPlace: string;
  timezone: string;
  chart: NatalResponse;
  forDate: Date;
}): DailyHoroscopePromptResult {
  const dateFmt = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: args.timezone,
  });
  const weekdayFmt = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    timeZone: args.timezone,
  });

  const facts: DailyHoroscopeFacts = {
    profile: {
      name: args.fullName,
      birthDateLocal: dateFmt.format(args.birthDateUtc),
      birthPlace: args.birthPlace,
      timezone: args.timezone,
    },
    date: dateFmt.format(args.forDate),
    weekday: weekdayFmt.format(args.forDate),
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

  const systemPrompt = `You are a thoughtful, modern astrologer. You write daily readings that are encouraging, specific, and grounded in the chart data given. Rules:

- Treat the chart JSON below as ground truth. Do NOT invent or contradict planet positions, signs, or houses.
- Output VALID JSON matching the schema exactly. No prose outside the JSON.
- Tone: warm, practical, modern English. Avoid clichés like "The cosmos has aligned"; speak as a wise friend.
- Each domain (career, love, health) gets a 2–3 sentence body and an integer score 1–100 indicating how favourable today is for that area.
- The headline is short (≤ 60 chars), capturing one specific astrological highlight from the chart.
- The body is one paragraph (3–5 sentences) connecting two or three chart placements to the day's themes.
- This is a Phase 2 daily reading drawn from the natal chart. Real transit/dasha grounding lands in Phase 3 — keep the language accordingly general about "today's themes" rather than naming specific transits you don't have data for.
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

  const userPrompt = `Subject: daily horoscope for ${facts.profile.name}.
Today (in their timezone): ${facts.weekday}, ${facts.date}.

Chart JSON (ground truth):
${JSON.stringify(facts, null, 2)}

Respond as JSON in exactly this shape:
${schema}
`;

  return { systemPrompt, userPrompt, facts };
}
