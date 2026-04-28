import type { Prediction, PredictionKind, Prisma } from "@prisma/client";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

import { prisma } from "@/backend/database/client";
import { resolveNatal } from "@/backend/services/chart.service";
import { callLlm } from "@/backend/services/llm/router";
import {
  buildHoroscopePrompt,
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

export async function resolveHoroscope(args: ResolveArgs): Promise<{
  cached: boolean;
  prediction: Prediction;
  payload: HoroscopePayload;
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
    },
  });
  if (!profile) throw new HoroscopeError(404, "profile not found");
  if (profile.userId !== args.userId) throw new HoroscopeError(403, "forbidden");

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
    return {
      cached: true,
      prediction: existing,
      payload: existing.payload as unknown as HoroscopePayload,
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

  const { systemPrompt, userPrompt, facts } = buildHoroscopePrompt({
    kind: args.kind,
    fullName: profile.fullName,
    birthDateUtc: profile.birthDate,
    birthPlace: profile.birthPlace,
    timezone: profile.timezone,
    chart,
    periodStart,
    periodEnd,
  });

  const llm = await callLlm({
    route: `horoscopes.${args.kind.toLowerCase()}`,
    userId: args.userId,
    systemPrompt,
    userPrompt,
    jsonOutput: true,
    temperature: 0.7,
    maxOutputTokens: args.kind === "YEARLY" ? 2048 : 1024,
  });

  let payload: HoroscopePayload;
  try {
    const raw = llm.text.trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const json = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
    payload = JSON.parse(json) as HoroscopePayload;
  } catch {
    throw new LlmError("router", 502, `LLM returned non-JSON response: ${llm.text.slice(0, 200)}`);
  }

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

  return { cached: false, prediction, payload };
}

// Backwards-compat alias for the original daily-only callsites.
export const resolveDailyHoroscope = (args: { userId: string; profileId: string; forDate?: Date }) =>
  resolveHoroscope({ ...args, kind: "DAILY" });

export type DailyHoroscopePayload = HoroscopePayload;
