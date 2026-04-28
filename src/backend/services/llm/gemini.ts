import { GoogleGenAI } from "@google/genai";

import type { LlmGenerateInput, LlmGenerateResult, LlmProvider } from "./types";
import { LlmError } from "./types";

// gemini-2.0-flash on Google's free tier — 1500 req/day, 1M tokens/min,
// fastest of the family; perfect for daily-horoscope work. Long-form
// reports later route through gemini-2.5-pro.
const DEFAULT_MODEL = "gemini-2.0-flash";

// Public Gemini Flash pricing (USD per 1M tokens) — used when the user
// is on a paid project. Free tier is, as the name suggests, free; the
// numbers still help us track relative budget when we move past free.
const PRICE_INPUT_USD_PER_M = 0.1;
const PRICE_OUTPUT_USD_PER_M = 0.4;

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
      const result = await ai.models.generateContent({
        model: DEFAULT_MODEL,
        contents: input.userPrompt,
        config: {
          systemInstruction: input.systemPrompt,
          temperature: input.temperature ?? 0.7,
          maxOutputTokens: input.maxOutputTokens ?? 2048,
          ...(input.jsonOutput ? { responseMimeType: "application/json" } : {}),
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
        model: DEFAULT_MODEL,
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
}
