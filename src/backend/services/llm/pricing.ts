import type { LlmProviderId } from "./types";

// Provider/model pricing snapshot. USD per 1M tokens. Update as providers
// shift their public list price; cost dashboard uses these to estimate
// spend, so a stale row produces stale (not wrong) numbers.
//
// Last manual review: 2026-04 — sources:
//   Gemini: https://ai.google.dev/pricing
//   Anthropic: https://www.anthropic.com/pricing
//   OpenAI: https://openai.com/api/pricing
export interface PricingRow {
  provider: LlmProviderId;
  model: string;
  inputUsdPerMTok: number;
  outputUsdPerMTok: number;
}

export const PRICING: PricingRow[] = [
  // Gemini
  { provider: "gemini", model: "gemini-2.5-flash", inputUsdPerMTok: 0.3, outputUsdPerMTok: 2.5 },
  { provider: "gemini", model: "gemini-2.5-pro", inputUsdPerMTok: 1.25, outputUsdPerMTok: 10.0 },
  { provider: "gemini", model: "gemini-2.0-flash", inputUsdPerMTok: 0.1, outputUsdPerMTok: 0.4 },

  // Anthropic
  { provider: "anthropic", model: "claude-sonnet-4-6", inputUsdPerMTok: 3.0, outputUsdPerMTok: 15.0 },
  { provider: "anthropic", model: "claude-sonnet-4-5", inputUsdPerMTok: 3.0, outputUsdPerMTok: 15.0 },
  { provider: "anthropic", model: "claude-haiku-4", inputUsdPerMTok: 1.0, outputUsdPerMTok: 5.0 },

  // OpenAI
  { provider: "openai", model: "gpt-4o", inputUsdPerMTok: 2.5, outputUsdPerMTok: 10.0 },
  { provider: "openai", model: "gpt-4o-mini", inputUsdPerMTok: 0.15, outputUsdPerMTok: 0.6 },
];

const FALLBACK: PricingRow = {
  provider: "gemini",
  model: "unknown",
  inputUsdPerMTok: 0.3,
  outputUsdPerMTok: 2.5,
};

export function lookupPricing(provider: string, model: string): PricingRow {
  const exact = PRICING.find((p) => p.provider === provider && p.model === model);
  if (exact) return exact;
  const prefix = PRICING.find((p) => p.provider === provider && model.startsWith(p.model));
  if (prefix) return prefix;
  const sameProvider = PRICING.find((p) => p.provider === provider);
  if (sameProvider) return sameProvider;
  return FALLBACK;
}

/** Convert a token count + provider/model into integer micro-USD (1e-6 USD). */
export function computeCostUsdMicro(
  provider: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const row = lookupPricing(provider, model);
  const inputUsd = (promptTokens / 1_000_000) * row.inputUsdPerMTok;
  const outputUsd = (completionTokens / 1_000_000) * row.outputUsdPerMTok;
  return Math.round((inputUsd + outputUsd) * 1_000_000);
}
