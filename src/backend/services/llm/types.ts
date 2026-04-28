export type LlmProviderId = "gemini" | "groq" | "anthropic" | "openai";

export interface LlmGenerateInput {
  systemPrompt: string;
  userPrompt: string;
  /** When set, the provider asks for a JSON response matching this informal schema description. */
  jsonOutput?: boolean;
  /** Soft cap. Implementations clamp to provider limits. */
  maxOutputTokens?: number;
  temperature?: number;
  /** Optional override for the provider's default model — long-form routes pick gemini-2.5-pro. */
  modelOverride?: string;
}

export interface LlmGenerateResult {
  text: string;
  provider: LlmProviderId;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsdMicro: number;
  latencyMs: number;
}

export interface LlmProvider {
  id: LlmProviderId;
  isAvailable(): boolean;
  generate(input: LlmGenerateInput): Promise<LlmGenerateResult>;
}

export class LlmError extends Error {
  constructor(public provider: LlmProviderId | "router", public status: number, message: string) {
    super(message);
    this.name = "LlmError";
  }
}
