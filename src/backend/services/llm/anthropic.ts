import type {
  LlmGenerateInput,
  LlmGenerateResult,
  LlmProvider,
  LlmStreamChunk,
  LlmStreamFinal,
} from "./types";
import { LlmError } from "./types";
import { computeCostUsdMicro } from "./pricing";

const DEFAULT_MODEL = "claude-sonnet-4-6";
const ANTHROPIC_VERSION = "2023-06-01";
const API_URL = "https://api.anthropic.com/v1/messages";

interface AnthropicContentBlock {
  type?: string;
  text?: string;
}
interface AnthropicResponse {
  content?: AnthropicContentBlock[];
  usage?: { input_tokens?: number; output_tokens?: number };
  type?: string;
}

function isTransientStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status < 600);
}

export class AnthropicProvider implements LlmProvider {
  id = "anthropic" as const;

  isAvailable(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }

  private apiKey(): string {
    const k = process.env.ANTHROPIC_API_KEY;
    if (!k) throw new LlmError("anthropic", 500, "ANTHROPIC_API_KEY not set");
    return k;
  }

  async generate(input: LlmGenerateInput): Promise<LlmGenerateResult> {
    const start = Date.now();
    const model = input.modelOverride ?? DEFAULT_MODEL;
    const apiKey = this.apiKey();

    const body = {
      model,
      max_tokens: input.maxOutputTokens ?? 2048,
      temperature: input.temperature ?? 0.7,
      system: input.systemPrompt,
      messages: [{ role: "user", content: input.userPrompt }],
    };

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify(body),
    }).catch((err: unknown) => {
      // Network-level failure (DNS, connection reset) → transient.
      throw new LlmError("anthropic", 503, `anthropic network error: ${err instanceof Error ? err.message : String(err)}`);
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const status = isTransientStatus(res.status) ? res.status : 502;
      throw new LlmError("anthropic", status, `anthropic ${res.status}: ${detail.slice(0, 300)}`);
    }

    const data = (await res.json()) as AnthropicResponse;
    const text = (data.content ?? [])
      .filter((b) => b?.type === "text" && typeof b.text === "string")
      .map((b) => b.text as string)
      .join("");
    const inputTokens = data.usage?.input_tokens ?? 0;
    const outputTokens = data.usage?.output_tokens ?? 0;

    return {
      text,
      provider: "anthropic",
      model,
      inputTokens,
      outputTokens,
      costUsdMicro: computeCostUsdMicro("anthropic", model, inputTokens, outputTokens),
      latencyMs: Date.now() - start,
    };
  }

  async *generateStream(input: LlmGenerateInput): AsyncGenerator<LlmStreamChunk, LlmStreamFinal, void> {
    const start = Date.now();
    const model = input.modelOverride ?? DEFAULT_MODEL;
    const apiKey = this.apiKey();

    const body = {
      model,
      max_tokens: input.maxOutputTokens ?? 2048,
      temperature: input.temperature ?? 0.7,
      system: input.systemPrompt,
      messages: [{ role: "user", content: input.userPrompt }],
      stream: true,
    };

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify(body),
    }).catch((err: unknown) => {
      throw new LlmError("anthropic", 503, `anthropic network error: ${err instanceof Error ? err.message : String(err)}`);
    });

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      const status = isTransientStatus(res.status) ? res.status : 502;
      throw new LlmError("anthropic", status, `anthropic stream ${res.status}: ${detail.slice(0, 300)}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let fullText = "";
    let inputTokens = 0;
    let outputTokens = 0;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n\n")) >= 0) {
        const chunk = buf.slice(0, nl);
        buf = buf.slice(nl + 2);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json || json === "[DONE]") continue;
          try {
            const evt = JSON.parse(json) as {
              type?: string;
              delta?: { type?: string; text?: string; output_tokens?: number };
              message?: { usage?: { input_tokens?: number } };
              usage?: { output_tokens?: number };
            };
            if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta" && evt.delta.text) {
              fullText += evt.delta.text;
              yield { text: evt.delta.text };
            } else if (evt.type === "message_start" && evt.message?.usage?.input_tokens != null) {
              inputTokens = evt.message.usage.input_tokens;
            } else if (evt.type === "message_delta" && evt.usage?.output_tokens != null) {
              outputTokens = evt.usage.output_tokens;
            }
          } catch {
            // ignore malformed SSE record
          }
        }
      }
    }

    return {
      fullText,
      provider: "anthropic",
      model,
      inputTokens,
      outputTokens,
      costUsdMicro: computeCostUsdMicro("anthropic", model, inputTokens, outputTokens),
      latencyMs: Date.now() - start,
    };
  }
}
