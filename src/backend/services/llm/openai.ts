import type {
  LlmGenerateInput,
  LlmGenerateResult,
  LlmProvider,
  LlmStreamChunk,
  LlmStreamFinal,
} from "./types";
import { LlmError } from "./types";
import { computeCostUsdMicro } from "./pricing";

const DEFAULT_MODEL = "gpt-4o";
const API_URL = "https://api.openai.com/v1/chat/completions";

interface OpenAiChoice {
  message?: { content?: string };
  delta?: { content?: string };
}
interface OpenAiResponse {
  choices?: OpenAiChoice[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

function isTransientStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status < 600);
}

export class OpenAiProvider implements LlmProvider {
  id = "openai" as const;

  isAvailable(): boolean {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  private apiKey(): string {
    const k = process.env.OPENAI_API_KEY;
    if (!k) throw new LlmError("openai", 500, "OPENAI_API_KEY not set");
    return k;
  }

  async generate(input: LlmGenerateInput): Promise<LlmGenerateResult> {
    const start = Date.now();
    const model = input.modelOverride ?? DEFAULT_MODEL;
    const apiKey = this.apiKey();

    const body: Record<string, unknown> = {
      model,
      max_tokens: input.maxOutputTokens ?? 2048,
      temperature: input.temperature ?? 0.7,
      messages: [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: input.userPrompt },
      ],
    };
    if (input.jsonOutput) body.response_format = { type: "json_object" };

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    }).catch((err: unknown) => {
      throw new LlmError("openai", 503, `openai network error: ${err instanceof Error ? err.message : String(err)}`);
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const status = isTransientStatus(res.status) ? res.status : 502;
      throw new LlmError("openai", status, `openai ${res.status}: ${detail.slice(0, 300)}`);
    }

    const data = (await res.json()) as OpenAiResponse;
    const text = data.choices?.[0]?.message?.content ?? "";
    const inputTokens = data.usage?.prompt_tokens ?? 0;
    const outputTokens = data.usage?.completion_tokens ?? 0;

    return {
      text,
      provider: "openai",
      model,
      inputTokens,
      outputTokens,
      costUsdMicro: computeCostUsdMicro("openai", model, inputTokens, outputTokens),
      latencyMs: Date.now() - start,
    };
  }

  async *generateStream(input: LlmGenerateInput): AsyncGenerator<LlmStreamChunk, LlmStreamFinal, void> {
    const start = Date.now();
    const model = input.modelOverride ?? DEFAULT_MODEL;
    const apiKey = this.apiKey();

    const body: Record<string, unknown> = {
      model,
      max_tokens: input.maxOutputTokens ?? 2048,
      temperature: input.temperature ?? 0.7,
      stream: true,
      stream_options: { include_usage: true },
      messages: [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: input.userPrompt },
      ],
    };
    if (input.jsonOutput) body.response_format = { type: "json_object" };

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    }).catch((err: unknown) => {
      throw new LlmError("openai", 503, `openai network error: ${err instanceof Error ? err.message : String(err)}`);
    });

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      const status = isTransientStatus(res.status) ? res.status : 502;
      throw new LlmError("openai", status, `openai stream ${res.status}: ${detail.slice(0, 300)}`);
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
        const block = buf.slice(0, nl);
        buf = buf.slice(nl + 2);
        for (const line of block.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json || json === "[DONE]") continue;
          try {
            const evt = JSON.parse(json) as OpenAiResponse;
            const delta = evt.choices?.[0]?.delta?.content;
            if (delta) {
              fullText += delta;
              yield { text: delta };
            }
            if (evt.usage) {
              inputTokens = evt.usage.prompt_tokens ?? inputTokens;
              outputTokens = evt.usage.completion_tokens ?? outputTokens;
            }
          } catch {
            // ignore malformed SSE
          }
        }
      }
    }

    return {
      fullText,
      provider: "openai",
      model,
      inputTokens,
      outputTokens,
      costUsdMicro: computeCostUsdMicro("openai", model, inputTokens, outputTokens),
      latencyMs: Date.now() - start,
    };
  }
}
