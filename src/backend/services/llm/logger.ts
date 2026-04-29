import { prisma } from "@/backend/database/client";

export const LLM_SURFACES = [
  "HOROSCOPE_DAILY",
  "HOROSCOPE_WEEKLY",
  "HOROSCOPE_MONTHLY",
  "HOROSCOPE_YEARLY",
  "CHAT",
  "REPORT",
  "COMPATIBILITY",
] as const;
export type SurfaceId = (typeof LLM_SURFACES)[number];

export interface LogLlmCallInput {
  userId?: string | null;
  surface: SurfaceId | string;
  provider: string;
  model: string;
  promptHash: string;
  promptTokens: number;
  completionTokens: number;
  costUsdMicro: number;
  latencyMs: number;
  success: boolean;
  errorCode?: string | null;
}

/**
 * Persist one LlmCallLog row. Fire-and-forget — never throws and never
 * blocks the user-facing flow on observability errors.
 */
export async function logLlmCall(input: LogLlmCallInput): Promise<void> {
  try {
    await prisma.llmCallLog.create({
      data: {
        userId: input.userId ?? null,
        route: input.surface,
        provider: input.provider,
        model: input.model,
        promptHash: input.promptHash,
        inputTokens: input.promptTokens,
        outputTokens: input.completionTokens,
        costUsdMicro: input.costUsdMicro,
        latencyMs: input.latencyMs,
        status: input.success ? "ok" : "error",
        error: input.errorCode ?? null,
      },
    });
  } catch (err) {
    console.warn("[llm.logger] failed to persist LlmCallLog", err);
  }
}

const ROUTE_TO_SURFACE: Record<string, SurfaceId> = {
  "horoscopes.daily": "HOROSCOPE_DAILY",
  "horoscopes.weekly": "HOROSCOPE_WEEKLY",
  "horoscopes.monthly": "HOROSCOPE_MONTHLY",
  "horoscopes.yearly": "HOROSCOPE_YEARLY",
  "ai.chat": "CHAT",
  "ai.chat.stream": "CHAT",
  "compatibility.synastry": "COMPATIBILITY",
};

/**
 * Map a logical route name (e.g. "horoscopes.daily", "reports.natal_full") to
 * a SurfaceId. Reports are matched by prefix because their kind suffix is
 * dynamic.
 */
export function surfaceForRoute(route: string): SurfaceId {
  if (ROUTE_TO_SURFACE[route]) return ROUTE_TO_SURFACE[route];
  if (route.startsWith("reports.")) return "REPORT";
  if (route.startsWith("horoscopes.")) return "HOROSCOPE_DAILY";
  if (route.startsWith("ai.chat")) return "CHAT";
  if (route.startsWith("compatibility")) return "COMPATIBILITY";
  return "CHAT";
}
