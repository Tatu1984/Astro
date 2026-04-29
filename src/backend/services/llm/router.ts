import { createHash } from "node:crypto";

import { AnthropicProvider } from "./anthropic";
import { GeminiProvider } from "./gemini";
import { logLlmCall, surfaceForRoute } from "./logger";
import { OpenAiProvider } from "./openai";
import type {
  LlmGenerateInput,
  LlmGenerateResult,
  LlmProvider,
  LlmProviderId,
  LlmStreamChunk,
  LlmStreamFinal,
} from "./types";
import { LlmError } from "./types";

const PROVIDERS: LlmProvider[] = [
  new GeminiProvider(),
  new AnthropicProvider(),
  new OpenAiProvider(),
];

const DEFAULT_ORDER: LlmProviderId[] = ["gemini", "anthropic", "openai"];

function envOrder(): LlmProviderId[] | null {
  const raw = process.env.LLM_PROVIDER_ORDER;
  if (!raw) return null;
  const parts = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean) as LlmProviderId[];
  return parts.length ? parts : null;
}

function orderedProviders(preferred?: LlmProviderId[]): LlmProvider[] {
  const order = preferred ?? envOrder() ?? DEFAULT_ORDER;
  const seen = new Set<string>();
  const out: LlmProvider[] = [];
  for (const id of order) {
    if (seen.has(id)) continue;
    const p = PROVIDERS.find((x) => x.id === id);
    if (p) {
      out.push(p);
      seen.add(id);
    }
  }
  for (const p of PROVIDERS) {
    if (!seen.has(p.id)) out.push(p);
  }
  return out;
}

export interface CallLlmInput extends LlmGenerateInput {
  /** Logical route name, e.g. "horoscopes.daily". Used for log + cost dashboard. */
  route: string;
  /** Optional user attribution for the log row. */
  userId?: string | null;
  /** Override the provider preference order for this call. */
  preferredOrder?: LlmProviderId[];
}

function hashPrompt(system: string, user: string): string {
  return createHash("sha256").update(`${system}\n---\n${user}`).digest("hex");
}

export async function callLlm(input: CallLlmInput): Promise<LlmGenerateResult & { promptHash: string }> {
  const promptHash = hashPrompt(input.systemPrompt, input.userPrompt);

  const available = orderedProviders(input.preferredOrder).filter((p) => p.isAvailable());
  if (available.length === 0) {
    throw new LlmError("router", 500, "no LLM provider configured (set GEMINI_API_KEY / ANTHROPIC_API_KEY / OPENAI_API_KEY)");
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
      // Hard errors (auth, invalid request) stop the chain. Transient
      // errors (5xx, 429, network) fall through to the next provider.
      if (!isTransient(err)) throw err;
    }
  }

  if (lastError instanceof LlmError) throw lastError;
  throw new LlmError("router", 502, `all LLM providers failed: ${String(lastError)}`);
}

const TRANSIENT_PATTERNS = [
  /\b503\b/,
  /\b502\b/,
  /\b504\b/,
  /\b429\b/,
  /UNAVAILABLE/i,
  /RESOURCE_EXHAUSTED/i,
  /high demand/i,
  /rate limit/i,
  /try again later/i,
  /network error/i,
  /quota exceeded/i,
];

function isTransient(err: unknown): boolean {
  if (err instanceof LlmError) {
    if (err.status === 429 || (err.status >= 500 && err.status < 600)) return true;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return TRANSIENT_PATTERNS.some((re) => re.test(msg));
}

/**
 * Single retry on transient upstream errors (503 high-demand, 429 rate
 * limit, UNAVAILABLE / RESOURCE_EXHAUSTED) with a short backoff. Most
 * resolve in well under a second on the provider's side.
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
 * Streaming variant. Walks the provider chain in order; falls through to
 * the next provider on transient errors that surface BEFORE any tokens
 * have been streamed. Once the stream begins yielding, no fallback (we
 * can't transparently restart mid-output).
 */
export async function* callLlmStream(
  input: CallLlmInput,
): AsyncGenerator<LlmStreamChunk, LlmStreamFinal & { promptHash: string }, void> {
  const promptHash = hashPrompt(input.systemPrompt, input.userPrompt);

  const candidates = orderedProviders(input.preferredOrder).filter(
    (p) => p.isAvailable() && typeof p.generateStream === "function",
  );
  if (candidates.length === 0) {
    throw new LlmError("router", 500, "no streaming provider configured");
  }

  let lastError: unknown = null;
  for (let i = 0; i < candidates.length; i++) {
    const provider = candidates[i];
    if (!provider.generateStream) continue;

    const stream = provider.generateStream(input);
    let started = false;
    let final: LlmStreamFinal;
    try {
      while (true) {
        const next = await stream.next();
        if (next.done) {
          final = next.value;
          break;
        }
        started = true;
        yield next.value;
      }
    } catch (err) {
      lastError = err;
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
      if (started || !isTransient(err) || i === candidates.length - 1) throw err;
      continue;
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

  if (lastError instanceof LlmError) throw lastError;
  throw new LlmError("router", 502, `all streaming providers failed: ${String(lastError)}`);
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
  // Fire-and-forget; logger.ts swallows persistence errors.
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
