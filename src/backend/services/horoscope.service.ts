import type { Prediction, Prisma } from "@prisma/client";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

import { prisma } from "@/backend/database/client";
import { resolveNatal } from "@/backend/services/chart.service";
import { callLlm } from "@/backend/services/llm/router";
import { buildDailyHoroscopePrompt } from "@/backend/services/prompt-builder";
import { LlmError } from "@/backend/services/llm/types";

export class HoroscopeError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "HoroscopeError";
  }
}

export interface DailyHoroscopePayload {
  headline: string;
  body: string;
  domains: {
    career: { score: number; body: string };
    love: { score: number; body: string };
    health: { score: number; body: string };
  };
}

interface ResolveDailyArgs {
  userId: string;
  profileId: string;
  /** Optional override; defaults to "today" in the profile's timezone. */
  forDate?: Date;
}

/**
 * Compute "midnight UTC of the local day" given a Date and a timezone.
 * Used as the canonical period_start key so that the same calendar day in
 * the profile's tz always maps to the same Prediction row.
 */
function startOfLocalDayUtc(d: Date, timezone: string): Date {
  const local = toZonedTime(d, timezone);
  const y = local.getFullYear();
  const m = local.getMonth();
  const day = local.getDate();
  // Construct local midnight string then back to UTC
  const localMidnight = new Date(Date.UTC(y, m, day, 0, 0, 0));
  return fromZonedTime(localMidnight, timezone);
}

export async function resolveDailyHoroscope(args: ResolveDailyArgs): Promise<{
  cached: boolean;
  prediction: Prediction;
  payload: DailyHoroscopePayload;
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
  const periodStart = startOfLocalDayUtc(forDate, profile.timezone);
  const periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000);

  // Cache check — same user/profile/day always returns the same row.
  const existing = await prisma.prediction.findUnique({
    where: {
      userId_profileId_kind_periodStart: {
        userId: args.userId,
        profileId: args.profileId,
        kind: "DAILY",
        periodStart,
      },
    },
  });
  if (existing) {
    return {
      cached: true,
      prediction: existing,
      payload: existing.payload as unknown as DailyHoroscopePayload,
    };
  }

  // Cache miss: compute or pull cached natal chart.
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

  const { systemPrompt, userPrompt, facts } = buildDailyHoroscopePrompt({
    fullName: profile.fullName,
    birthDateUtc: profile.birthDate,
    birthPlace: profile.birthPlace,
    timezone: profile.timezone,
    chart,
    forDate,
  });

  const llm = await callLlm({
    route: "horoscopes.daily",
    userId: args.userId,
    systemPrompt,
    userPrompt,
    jsonOutput: true,
    temperature: 0.7,
    maxOutputTokens: 1024,
  });

  let payload: DailyHoroscopePayload;
  try {
    payload = JSON.parse(llm.text) as DailyHoroscopePayload;
  } catch {
    throw new LlmError("router", 502, "LLM returned non-JSON response");
  }

  // Persist
  const prediction = await prisma.prediction.create({
    data: {
      userId: args.userId,
      profileId: args.profileId,
      chartId: chartRow.id,
      kind: "DAILY",
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
