import { createHash } from "node:crypto";

import { prisma } from "@/backend/database/client";

import { GeminiProvider } from "./gemini";
import type { LlmGenerateInput, LlmGenerateResult, LlmProvider } from "./types";
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
      const result = await provider.generate(input);
      await writeLog({
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
      await writeLog({
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

async function writeLog(input: {
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
}) {
  try {
    await prisma.llmCallLog.create({
      data: {
        userId: input.userId ?? null,
        route: input.route,
        provider: input.provider,
        model: input.model,
        promptHash: input.promptHash,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        costUsdMicro: input.costUsdMicro,
        latencyMs: input.latencyMs,
        status: input.status,
        error: input.error,
      },
    });
  } catch {
    // observability shouldn't kill the request
  }
}
