import { createHash } from "node:crypto";

import { GeminiProvider } from "./gemini";
import { logLlmCall, surfaceForRoute } from "./logger";
import type {
  LlmGenerateInput,
  LlmGenerateResult,
  LlmProvider,
  LlmStreamChunk,
  LlmStreamFinal,
} from "./types";
import { LlmError } from "./types";

// Phase 2: Gemini primary. Add GroqProvider / AnthropicProvider /
// OpenAIProvider here as their keys land — order = fallback chain.
const PROVIDERS: LlmProvider[] = [new GeminiProvider()];

export interface CallLlmInput extends LlmGenerateInput {
  /** Logical route name, e.g. "horoscopes.daily". Used for log + cost dashboard. */
  route: string;
  /** Optional user attribution for the log row. */
  userId?: string | null;
}

function hashPrompt(system: string, user: string): string {
  return createHash("sha256").update(`${system}\n---\n${user}`).digest("hex");
}

export async function callLlm(input: CallLlmInput): Promise<LlmGenerateResult & { promptHash: string }> {
  const promptHash = hashPrompt(input.systemPrompt, input.userPrompt);

  const available = PROVIDERS.filter((p) => p.isAvailable());
  if (available.length === 0) {
    throw new LlmError("router", 500, "no LLM provider configured (set GEMINI_API_KEY)");
  }

  let lastError: unknown = null;
  for (const provider of available) {
    try {
      const result = await callWithTransientRetry(provider, input);
      writeLog({
        ...input,
        promptHash,
        provider: result.provider,
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsdMicro: result.costUsdMicro,
        latencyMs: result.latencyMs,
        status: "ok",
      });
      return { ...result, promptHash };
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      writeLog({
        ...input,
        promptHash,
        provider: provider.id,
        model: "n/a",
        inputTokens: 0,
        outputTokens: 0,
        costUsdMicro: 0,
        latencyMs: 0,
        status: "error",
        error: msg,
      });
      // continue to next provider in fallback chain
    }
  }

  if (lastError instanceof LlmError) throw lastError;
  throw new LlmError("router", 502, `all LLM providers failed: ${String(lastError)}`);
}

const TRANSIENT_PATTERNS = [
  /\b503\b/,
  /\b429\b/,
  /UNAVAILABLE/i,
  /RESOURCE_EXHAUSTED/i,
  /high demand/i,
  /rate limit/i,
  /try again later/i,
];

function isTransient(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return TRANSIENT_PATTERNS.some((re) => re.test(msg));
}

/**
 * Single retry on transient upstream errors (503 high-demand, 429 rate
 * limit, UNAVAILABLE / RESOURCE_EXHAUSTED) with a short backoff. Most
 * resolve in well under a second on Gemini's side.
 */
async function callWithTransientRetry(
  provider: LlmProvider,
  input: LlmGenerateInput,
): Promise<LlmGenerateResult> {
  try {
    return await provider.generate(input);
  } catch (err) {
    if (!isTransient(err)) throw err;
    await new Promise((r) => setTimeout(r, 1500));
    return provider.generate(input);
  }
}

/**
 * Streaming variant. Picks the first available provider that implements
 * generateStream(); writes a single LlmCallLog row with usage at the end
 * of the stream. No multi-provider fallback yet — a stream that has
 * already started can't transparently fail over without losing context.
 */
export async function* callLlmStream(
  input: CallLlmInput,
): AsyncGenerator<LlmStreamChunk, LlmStreamFinal & { promptHash: string }, void> {
  const promptHash = hashPrompt(input.systemPrompt, input.userPrompt);
  const provider = PROVIDERS.find((p) => p.isAvailable() && typeof p.generateStream === "function");
  if (!provider || !provider.generateStream) {
    throw new LlmError("router", 500, "no streaming provider configured");
  }

  const stream = provider.generateStream(input);
  let final: LlmStreamFinal;
  try {
    while (true) {
      const next = await stream.next();
      if (next.done) {
        final = next.value;
        break;
      }
      yield next.value;
    }
  } catch (err) {
    writeLog({
      ...input,
      promptHash,
      provider: provider.id,
      model: "n/a",
      inputTokens: 0,
      outputTokens: 0,
      costUsdMicro: 0,
      latencyMs: 0,
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  writeLog({
    ...input,
    promptHash,
    provider: final.provider,
    model: final.model,
    inputTokens: final.inputTokens,
    outputTokens: final.outputTokens,
    costUsdMicro: final.costUsdMicro,
    latencyMs: final.latencyMs,
    status: "ok",
  });

  return { ...final, promptHash };
}

interface WriteLogInput {
  route: string;
  userId?: string | null;
  promptHash: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsdMicro: number;
  latencyMs: number;
  status: "ok" | "error";
  error?: string;
}

function writeLog(input: WriteLogInput): void {
  // Fire-and-forget; logger.ts never throws.
  void logLlmCall({
    userId: input.userId,
    surface: surfaceForRoute(input.route),
    provider: input.provider,
    model: input.model,
    promptHash: input.promptHash,
    promptTokens: input.inputTokens,
    completionTokens: input.outputTokens,
    costUsdMicro: input.costUsdMicro,
    latencyMs: input.latencyMs,
    success: input.status === "ok",
    errorCode: input.error,
  });
}
