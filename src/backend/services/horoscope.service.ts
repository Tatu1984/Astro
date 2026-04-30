import type { Prediction, PredictionKind, Prisma } from "@prisma/client";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

import { prisma } from "@/backend/database/client";
import { resolveNatal } from "@/backend/services/chart.service";
import { scoreBirthData } from "@/backend/services/llm/birthDataQuality";
import { callLlm, callLlmStream } from "@/backend/services/llm/router";
import { appendDisclaimer, flagUnsafeOutput, softenFlaggedOutput } from "@/backend/services/llm/safety";
import {
  buildHoroscopePrompt,
  getReadingStyleForUser,
  type HoroscopeKind,
} from "@/backend/services/prompt-builder";
import { LlmError } from "@/backend/services/llm/types";

export class HoroscopeError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "HoroscopeError";
  }
}

export interface HoroscopePayload {
  headline: string;
  body: string;
  domains: {
    career: { score: number; body: string };
    love: { score: number; body: string };
    health: { score: number; body: string };
  };
}

export interface HoroscopeDisplayFact {
  /** stable code, e.g. "ASC_LEO" or "SUN_LEO_H7" — useful for keys / future deep-links */
  code: string;
  /** the technical anchor, e.g. "Sun in Leo, 7th house" */
  term: string;
  /** plain-English one-liner safe to read without any astrology background */
  humanText: string;
}

export type ResolveHoroscopeKind = HoroscopeKind;

interface ResolveArgs {
  userId: string;
  profileId: string;
  kind: ResolveHoroscopeKind;
  forDate?: Date;
}

const KIND_TO_PRISMA: Record<ResolveHoroscopeKind, PredictionKind> = {
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
  YEARLY: "YEARLY",
};

/**
 * Compute the period boundaries for a given kind around a moment, in the
 * profile's timezone. Returns UTC Date objects.
 *
 *   DAILY   → local midnight today   → +1 day
 *   WEEKLY  → local Monday 00:00     → +7 days
 *   MONTHLY → local 1st of month     → +1 month
 *   YEARLY  → local Jan 1            → +1 year
 */
/**
 * Per-kind LLM output budget. WEEKLY/MONTHLY/YEARLY routinely truncate
 * mid-JSON at 1024 tokens because the payload contains 4 separate
 * narrative blocks (headline + body + 3 domain bodies). Generous budget
 * is cheap on Gemini Flash and the alternative is a blank screen.
 */
function maxTokensFor(kind: ResolveHoroscopeKind): number {
  switch (kind) {
    case "DAILY": return 1024;
    case "WEEKLY": return 2048;
    case "MONTHLY": return 3072;
    case "YEARLY": return 4096;
  }
}

/**
 * Best-effort JSON extraction from an LLM response. Handles:
 *   - Surrounding prose / markdown code fences
 *   - Trailing commentary after the JSON envelope
 *   - Truncated tail (closes unfinished strings + missing braces if it can)
 * Throws if no usable object can be salvaged.
 */
function parseHoroscopePayloadFromText(raw: string): HoroscopePayload {
  const text = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  const start = text.indexOf("{");
  if (start < 0) throw new Error("no opening brace");
  const end = text.lastIndexOf("}");
  let candidate = end > start ? text.slice(start, end + 1) : text.slice(start);
  // First try: as-is.
  try {
    return JSON.parse(candidate) as HoroscopePayload;
  } catch {
    // Fallthrough to repair.
  }
  // Repair: close any unfinished string, then balance braces.
  // Count quotes outside escape sequences.
  let inStr = false;
  let escape = false;
  for (let i = 0; i < candidate.length; i++) {
    const ch = candidate[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') inStr = !inStr;
  }
  if (inStr) candidate += '"';
  // Balance braces.
  let depth = 0;
  for (const ch of candidate) {
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
  }
  while (depth-- > 0) candidate += "}";
  return JSON.parse(candidate) as HoroscopePayload;
}

function periodBoundsUtc(
  d: Date,
  kind: ResolveHoroscopeKind,
  timezone: string,
): { start: Date; end: Date } {
  const local = toZonedTime(d, timezone);
  let startLocal: Date;
  let endLocal: Date;
  const y = local.getFullYear();
  const m = local.getMonth();
  const day = local.getDate();

  switch (kind) {
    case "DAILY": {
      startLocal = new Date(Date.UTC(y, m, day, 0, 0, 0));
      endLocal = new Date(Date.UTC(y, m, day + 1, 0, 0, 0));
      break;
    }
    case "WEEKLY": {
      // ISO weeks: Monday=1..Sunday=7. JS Date.getDay(): Sun=0..Sat=6.
      const dow = local.getDay() === 0 ? 7 : local.getDay();
      const monday = day - (dow - 1);
      startLocal = new Date(Date.UTC(y, m, monday, 0, 0, 0));
      endLocal = new Date(Date.UTC(y, m, monday + 7, 0, 0, 0));
      break;
    }
    case "MONTHLY": {
      startLocal = new Date(Date.UTC(y, m, 1, 0, 0, 0));
      endLocal = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0));
      break;
    }
    case "YEARLY": {
      startLocal = new Date(Date.UTC(y, 0, 1, 0, 0, 0));
      endLocal = new Date(Date.UTC(y + 1, 0, 1, 0, 0, 0));
      break;
    }
  }

  return {
    start: fromZonedTime(startLocal, timezone),
    end: fromZonedTime(endLocal, timezone),
  };
}

const SIGN_FEEL: Record<string, string> = {
  Aries: "bold and direct",
  Taurus: "steady and grounded",
  Gemini: "curious and quick",
  Cancer: "tender and protective",
  Leo: "warm and expressive",
  Virgo: "careful and analytical",
  Libra: "fair and relational",
  Scorpio: "intense and private",
  Sagittarius: "open and adventurous",
  Capricorn: "ambitious and disciplined",
  Aquarius: "independent and original",
  Pisces: "dreamy and empathic",
};

const PLANET_THEME: Record<string, string> = {
  Sun: "your core identity",
  Moon: "your emotional inner world",
  Mercury: "how you think and speak",
  Venus: "how you love and value",
  Mars: "how you push and act",
  Jupiter: "how you grow and trust",
  Saturn: "how you commit and discipline",
  Uranus: "your urge to break free",
  Neptune: "your dreams and longings",
  Pluto: "your power to transform",
};

const HOUSE_THEME: Record<number, string> = {
  1: "self and how you appear",
  2: "money and self-worth",
  3: "communication and short trips",
  4: "home and family",
  5: "creativity and romance",
  6: "work and daily health",
  7: "partnerships",
  8: "shared resources and depth",
  9: "travel and big ideas",
  10: "career and reputation",
  11: "friends and goals",
  12: "solitude and the unseen",
};

interface FactsLike {
  ascendant?: { sign?: string };
  midheaven?: { sign?: string };
  planets?: Array<{
    name?: string;
    sign?: string;
    house?: number | null;
    retrograde?: boolean;
  }>;
}

function buildDisplayFacts(facts: FactsLike): HoroscopeDisplayFact[] {
  const out: HoroscopeDisplayFact[] = [];
  const ascSign = facts.ascendant?.sign;
  if (ascSign) {
    out.push({
      code: `ASC_${ascSign.toUpperCase()}`,
      term: `Ascendant in ${ascSign}`,
      humanText: `You meet the world with a ${SIGN_FEEL[ascSign] ?? ascSign} first impression`,
    });
  }
  const mcSign = facts.midheaven?.sign;
  if (mcSign) {
    out.push({
      code: `MC_${mcSign.toUpperCase()}`,
      term: `Midheaven in ${mcSign}`,
      humanText: `Your public self and career direction lean ${SIGN_FEEL[mcSign] ?? mcSign}`,
    });
  }
  const planets = facts.planets ?? [];
  for (const p of planets.slice(0, 6)) {
    if (!p?.name || !p?.sign) continue;
    const theme = PLANET_THEME[p.name] ?? p.name.toLowerCase();
    const houseTheme = p.house ? HOUSE_THEME[p.house] : null;
    const houseBit = houseTheme ? `, focused on ${houseTheme}` : "";
    const retroBit = p.retrograde ? "; currently inward / under review" : "";
    out.push({
      code: `${p.name.toUpperCase()}_${p.sign.toUpperCase()}${p.house ? `_H${p.house}` : ""}${p.retrograde ? "_R" : ""}`,
      term: `${p.name} in ${p.sign}${p.house ? `, house ${p.house}` : ""}${p.retrograde ? " (retrograde)" : ""}`,
      humanText: `${theme} expresses in a ${SIGN_FEEL[p.sign] ?? p.sign} way${houseBit}${retroBit}`,
    });
  }
  return out;
}

/**
 * Cache-only fast path. Returns the existing Prediction + payload if one
 * exists for (user, profile, kind, period), or null. Used by the UI to
 * decide between rendering immediately vs. opening a streaming request.
 */
export async function lookupCachedHoroscope(args: ResolveArgs): Promise<{
  prediction: Prediction;
  payload: HoroscopePayload;
  displayFacts: HoroscopeDisplayFact[];
} | null> {
  const profile = await prisma.profile.findUnique({
    where: { id: args.profileId },
    select: { id: true, userId: true, timezone: true },
  });
  if (!profile || profile.userId !== args.userId) return null;
  const forDate = args.forDate ?? new Date();
  const { start: periodStart } = periodBoundsUtc(forDate, args.kind, profile.timezone);
  const existing = await prisma.prediction.findUnique({
    where: {
      userId_profileId_kind_periodStart: {
        userId: args.userId,
        profileId: args.profileId,
        kind: KIND_TO_PRISMA[args.kind],
        periodStart,
      },
    },
  });
  if (!existing) return null;
  const cachedFacts = (existing.facts ?? null) as FactsLike | null;
  return {
    prediction: existing,
    payload: existing.payload as unknown as HoroscopePayload,
    displayFacts: cachedFacts ? buildDisplayFacts(cachedFacts) : [],
  };
}

export async function resolveHoroscope(args: ResolveArgs): Promise<{
  cached: boolean;
  prediction: Prediction;
  payload: HoroscopePayload;
  displayFacts: HoroscopeDisplayFact[];
}> {
  const profile = await prisma.profile.findUnique({
    where: { id: args.profileId },
    select: {
      id: true,
      userId: true,
      fullName: true,
      birthDate: true,
      birthPlace: true,
      latitude: true,
      longitude: true,
      timezone: true,
      unknownTime: true,
    },
  });
  if (!profile) throw new HoroscopeError(404, "profile not found");
  if (profile.userId !== args.userId) throw new HoroscopeError(403, "forbidden");

  const quality = scoreBirthData({
    unknownTime: profile.unknownTime,
    birthDate: profile.birthDate,
    latitude: Number(profile.latitude),
    longitude: Number(profile.longitude),
    birthPlace: profile.birthPlace,
    timezone: profile.timezone,
  });

  const forDate = args.forDate ?? new Date();
  const { start: periodStart, end: periodEnd } = periodBoundsUtc(forDate, args.kind, profile.timezone);

  const existing = await prisma.prediction.findUnique({
    where: {
      userId_profileId_kind_periodStart: {
        userId: args.userId,
        profileId: args.profileId,
        kind: KIND_TO_PRISMA[args.kind],
        periodStart,
      },
    },
  });
  if (existing) {
    const cachedFacts = (existing.facts ?? null) as FactsLike | null;
    return {
      cached: true,
      prediction: existing,
      payload: existing.payload as unknown as HoroscopePayload,
      displayFacts: cachedFacts ? buildDisplayFacts(cachedFacts) : [],
    };
  }

  const { chart, row: chartRow } = await resolveNatal({
    userId: args.userId,
    profileId: args.profileId,
    request: {
      birth_datetime_utc: profile.birthDate.toISOString(),
      latitude: Number(profile.latitude),
      longitude: Number(profile.longitude),
      house_system: "PLACIDUS",
      system: "BOTH",
    },
  });

  const readingStyle = await getReadingStyleForUser(args.userId);
  const { systemPrompt, userPrompt, facts } = buildHoroscopePrompt({
    kind: args.kind,
    fullName: profile.fullName,
    birthDateUtc: profile.birthDate,
    birthPlace: profile.birthPlace,
    timezone: profile.timezone,
    chart,
    periodStart,
    periodEnd,
    quality,
    readingStyle,
  });

  const llm = await callLlm({
    route: `horoscopes.${args.kind.toLowerCase()}`,
    userId: args.userId,
    systemPrompt,
    userPrompt,
    jsonOutput: true,
    temperature: 0.7,
    maxOutputTokens: maxTokensFor(args.kind),
  });

  let payload: HoroscopePayload;
  try {
    payload = parseHoroscopePayloadFromText(llm.text);
  } catch {
    throw new LlmError("router", 502, `LLM returned non-JSON response: ${llm.text.slice(0, 200)}`);
  }

  const surface = `HOROSCOPE_${args.kind}` as const;
  const flagged = flagUnsafeOutput(payload.body);
  if (flagged.flagged) {
    console.warn("[llm.safety] horoscope flagged", { surface, reasons: flagged.reasons, userId: args.userId });
    payload = { ...payload, body: softenFlaggedOutput(payload.body) };
  }
  payload = { ...payload, body: appendDisclaimer(payload.body, surface) };

  const prediction = await prisma.prediction.create({
    data: {
      userId: args.userId,
      profileId: args.profileId,
      chartId: chartRow.id,
      kind: KIND_TO_PRISMA[args.kind],
      periodStart,
      periodEnd,
      facts: facts as unknown as Prisma.InputJsonValue,
      payload: payload as unknown as Prisma.InputJsonValue,
      text: payload.body,
      llmProvider: llm.provider,
      llmModel: llm.model,
      promptHash: llm.promptHash,
      inputTokens: llm.inputTokens,
      outputTokens: llm.outputTokens,
      costUsdMicro: llm.costUsdMicro,
    },
  });

  return {
    cached: false,
    prediction,
    payload,
    displayFacts: buildDisplayFacts(facts as unknown as FactsLike),
  };
}

// Backwards-compat alias for the original daily-only callsites.
export const resolveDailyHoroscope = (args: { userId: string; profileId: string; forDate?: Date }) =>
  resolveHoroscope({ ...args, kind: "DAILY" });

export type DailyHoroscopePayload = HoroscopePayload;

export type HoroscopeStreamEvent =
  | { kind: "delta"; text: string }
  | {
      kind: "done";
      cached: boolean;
      payload: HoroscopePayload;
      displayFacts: HoroscopeDisplayFact[];
      provider: string | null;
      model: string | null;
      generatedAt: string;
    }
  | { kind: "error"; message: string };

/**
 * Streaming variant of resolveHoroscope. Yields a `done` event right away
 * if the prediction is already cached. Otherwise streams `delta` events
 * as the LLM emits tokens, then a `done` event with the parsed payload.
 *
 * Note: Gemini's JSON mode emits structured output incrementally; deltas
 * are not human-readable until the buffer is parsed at `done` time.
 */
export async function* resolveHoroscopeStream(
  args: ResolveArgs,
): AsyncGenerator<HoroscopeStreamEvent, void, void> {
  const profile = await prisma.profile.findUnique({
    where: { id: args.profileId },
    select: {
      id: true,
      userId: true,
      fullName: true,
      birthDate: true,
      birthPlace: true,
      latitude: true,
      longitude: true,
      timezone: true,
      unknownTime: true,
    },
  });
  if (!profile) {
    yield { kind: "error", message: "profile not found" };
    return;
  }
  if (profile.userId !== args.userId) {
    yield { kind: "error", message: "forbidden" };
    return;
  }

  const forDate = args.forDate ?? new Date();
  const { start: periodStart, end: periodEnd } = periodBoundsUtc(forDate, args.kind, profile.timezone);

  const existing = await prisma.prediction.findUnique({
    where: {
      userId_profileId_kind_periodStart: {
        userId: args.userId,
        profileId: args.profileId,
        kind: KIND_TO_PRISMA[args.kind],
        periodStart,
      },
    },
  });
  if (existing) {
    const cachedFacts = (existing.facts ?? null) as FactsLike | null;
    yield {
      kind: "done",
      cached: true,
      payload: existing.payload as unknown as HoroscopePayload,
      displayFacts: cachedFacts ? buildDisplayFacts(cachedFacts) : [],
      provider: existing.llmProvider ?? null,
      model: existing.llmModel ?? null,
      generatedAt: existing.createdAt.toISOString(),
    };
    return;
  }

  const quality = scoreBirthData({
    unknownTime: profile.unknownTime,
    birthDate: profile.birthDate,
    latitude: Number(profile.latitude),
    longitude: Number(profile.longitude),
    birthPlace: profile.birthPlace,
    timezone: profile.timezone,
  });

  const { chart, row: chartRow } = await resolveNatal({
    userId: args.userId,
    profileId: args.profileId,
    request: {
      birth_datetime_utc: profile.birthDate.toISOString(),
      latitude: Number(profile.latitude),
      longitude: Number(profile.longitude),
      house_system: "PLACIDUS",
      system: "BOTH",
    },
  });

  const readingStyle = await getReadingStyleForUser(args.userId);
  const { systemPrompt, userPrompt, facts } = buildHoroscopePrompt({
    kind: args.kind,
    fullName: profile.fullName,
    birthDateUtc: profile.birthDate,
    birthPlace: profile.birthPlace,
    timezone: profile.timezone,
    chart,
    periodStart,
    periodEnd,
    quality,
    readingStyle,
  });

  const stream = callLlmStream({
    route: `horoscopes.${args.kind.toLowerCase()}.stream`,
    userId: args.userId,
    systemPrompt,
    userPrompt,
    jsonOutput: true,
    temperature: 0.7,
    maxOutputTokens: maxTokensFor(args.kind),
  });

  let fullText = "";
  let final: { provider: string; model: string; promptHash: string; inputTokens: number; outputTokens: number; costUsdMicro: number } | null = null;
  try {
    while (true) {
      const next = await stream.next();
      if (next.done) {
        final = {
          provider: next.value.provider,
          model: next.value.model,
          promptHash: next.value.promptHash,
          inputTokens: next.value.inputTokens,
          outputTokens: next.value.outputTokens,
          costUsdMicro: next.value.costUsdMicro,
        };
        break;
      }
      fullText += next.value.text;
      yield { kind: "delta", text: next.value.text };
    }
  } catch (err) {
    yield { kind: "error", message: err instanceof Error ? err.message : String(err) };
    return;
  }
  if (!final) {
    yield { kind: "error", message: "stream ended without final usage" };
    return;
  }

  let payload: HoroscopePayload;
  try {
    payload = parseHoroscopePayloadFromText(fullText);
  } catch {
    yield { kind: "error", message: `LLM returned non-JSON response: ${fullText.slice(0, 200)}` };
    return;
  }

  const surface = `HOROSCOPE_${args.kind}` as const;
  const flagged = flagUnsafeOutput(payload.body);
  if (flagged.flagged) {
    console.warn("[llm.safety] horoscope flagged", { surface, reasons: flagged.reasons, userId: args.userId });
    payload = { ...payload, body: softenFlaggedOutput(payload.body) };
  }
  payload = { ...payload, body: appendDisclaimer(payload.body, surface) };

  const prediction = await prisma.prediction.create({
    data: {
      userId: args.userId,
      profileId: args.profileId,
      chartId: chartRow.id,
      kind: KIND_TO_PRISMA[args.kind],
      periodStart,
      periodEnd,
      facts: facts as unknown as Prisma.InputJsonValue,
      payload: payload as unknown as Prisma.InputJsonValue,
      text: payload.body,
      llmProvider: final.provider,
      llmModel: final.model,
      promptHash: final.promptHash,
      inputTokens: final.inputTokens,
      outputTokens: final.outputTokens,
      costUsdMicro: final.costUsdMicro,
    },
  });

  yield {
    kind: "done",
    cached: false,
    payload,
    displayFacts: buildDisplayFacts(facts as unknown as FactsLike),
    provider: prediction.llmProvider,
    model: prediction.llmModel,
    generatedAt: prediction.createdAt.toISOString(),
  };
}
