import { GoogleGenAI } from "@google/genai";

import type {
  LlmGenerateInput,
  LlmGenerateResult,
  LlmProvider,
  LlmStreamChunk,
  LlmStreamFinal,
} from "./types";
import { LlmError } from "./types";

// gemini-2.5-flash is the recommended fast tier on the free tier today
// (2.0-flash has been quietly capped on most new projects). Pricing on the
// paid tier for 2.5-flash is similar.
const DEFAULT_MODEL = "gemini-2.5-flash";

// Public Gemini 2.5 Flash pricing (USD per 1M tokens). Free tier is free;
// keeping the numbers means our cost dashboard reflects the right budget
// once a project is upgraded out of free tier.
const PRICE_INPUT_USD_PER_M = 0.3;
const PRICE_OUTPUT_USD_PER_M = 2.5;

export class GeminiProvider implements LlmProvider {
  id = "gemini" as const;
  private client: GoogleGenAI | null = null;

  isAvailable() {
    return Boolean(process.env.GEMINI_API_KEY);
  }

  private getClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new LlmError("gemini", 500, "GEMINI_API_KEY not set");
    if (!this.client) this.client = new GoogleGenAI({ apiKey });
    return this.client;
  }

  async generate(input: LlmGenerateInput): Promise<LlmGenerateResult> {
    const start = Date.now();
    const ai = this.getClient();

    try {
      const model = input.modelOverride ?? DEFAULT_MODEL;
      const result = await ai.models.generateContent({
        model,
        contents: input.userPrompt,
        config: {
          systemInstruction: input.systemPrompt,
          temperature: input.temperature ?? 0.7,
          maxOutputTokens: input.maxOutputTokens ?? 2048,
          // Disable extended reasoning for JSON routes — thinking tokens
          // get billed and sometimes leak into the visible output even
          // with responseMimeType set, which breaks JSON.parse.
          ...(input.jsonOutput
            ? {
                responseMimeType: "application/json",
                thinkingConfig: { thinkingBudget: 0 },
              }
            : {}),
        },
      });

      const text = result.text ?? "";
      const usage = result.usageMetadata ?? {};
      const inputTokens = usage.promptTokenCount ?? 0;
      const outputTokens = (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0);

      const costUsdMicro = Math.round(
        (inputTokens * PRICE_INPUT_USD_PER_M + outputTokens * PRICE_OUTPUT_USD_PER_M) *
          1_000_000 / 1_000_000,
      ) * 1_000_000 / 1_000_000; // keep arithmetic in micro-USD
      const cost = Math.round(
        (inputTokens / 1_000_000) * PRICE_INPUT_USD_PER_M * 1_000_000 +
          (outputTokens / 1_000_000) * PRICE_OUTPUT_USD_PER_M * 1_000_000,
      );

      return {
        text,
        provider: "gemini",
        model,
        inputTokens,
        outputTokens,
        costUsdMicro: cost,
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new LlmError("gemini", 502, `gemini call failed: ${msg}`);
    }
  }

  async *generateStream(input: LlmGenerateInput): AsyncGenerator<LlmStreamChunk, LlmStreamFinal, void> {
    const start = Date.now();
    const ai = this.getClient();
    const model = input.modelOverride ?? DEFAULT_MODEL;

    try {
      const stream = await ai.models.generateContentStream({
        model,
        contents: input.userPrompt,
        config: {
          systemInstruction: input.systemPrompt,
          temperature: input.temperature ?? 0.7,
          maxOutputTokens: input.maxOutputTokens ?? 2048,
          ...(input.jsonOutput
            ? {
                responseMimeType: "application/json",
                thinkingConfig: { thinkingBudget: 0 },
              }
            : {}),
        },
      });

      let fullText = "";
      let lastUsage: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        thoughtsTokenCount?: number;
      } = {};

      for await (const chunk of stream) {
        const text = chunk.text ?? "";
        if (text) {
          fullText += text;
          yield { text };
        }
        if (chunk.usageMetadata) lastUsage = chunk.usageMetadata;
      }

      const inputTokens = lastUsage.promptTokenCount ?? 0;
      const outputTokens = (lastUsage.candidatesTokenCount ?? 0) + (lastUsage.thoughtsTokenCount ?? 0);
      const cost = Math.round(
        (inputTokens / 1_000_000) * PRICE_INPUT_USD_PER_M * 1_000_000 +
          (outputTokens / 1_000_000) * PRICE_OUTPUT_USD_PER_M * 1_000_000,
      );

      return {
        fullText,
        provider: "gemini",
        model,
        inputTokens,
        outputTokens,
        costUsdMicro: cost,
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new LlmError("gemini", 502, `gemini stream failed: ${msg}`);
    }
  }
}
