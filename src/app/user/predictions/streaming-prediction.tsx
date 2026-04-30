"use client";

import { useEffect, useRef, useState } from "react";

import { Card } from "@/frontend/components/ui/Card";

import { PredictionBody, type DisplayFact } from "./prediction-body";

interface Props {
  kind: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  profileId: string;
  rangeLabelFor: (start: Date, end: Date) => string;
}

interface Payload {
  headline: string;
  body: string;
  domains: {
    career: { score: number; body: string };
    love: { score: number; body: string };
    health: { score: number; body: string };
  };
}

interface DonePayload {
  kind: "done";
  payload: Payload;
  displayFacts: DisplayFact[];
  provider: string | null;
  model: string | null;
  generatedAt: string;
  cached: boolean;
}

type StreamFrame =
  | { kind: "delta"; text: string }
  | DonePayload
  | { kind: "error"; message: string };

/**
 * Hits POST /api/horoscopes/:kind/stream for a cache-miss prediction. As
 * deltas arrive, surfaces them in a teaser block (Gemini's JSON-mode
 * deltas are not human-readable but the spinner reassures the user that
 * something is happening). On `done`, swaps to PredictionBody. On any
 * SSE failure, transparently falls back to GET (which computes
 * synchronously and caches).
 */
export function StreamingPrediction({ kind, profileId, rangeLabelFor }: Props) {
  const [done, setDone] = useState<DonePayload | null>(null);
  const [streamingChars, setStreamingChars] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;

    async function fallbackToGet() {
      try {
        const res = await fetch(`/api/horoscopes/${kind}?profileId=${profileId}`);
        if (!res.ok) throw new Error(`fallback ${res.status}`);
        const data = (await res.json()) as {
          payload: Payload;
          displayFacts: DisplayFact[];
          provider: string | null;
          model: string | null;
          generatedAt: string;
          cached: boolean;
        };
        if (!cancelled) {
          setDone({ kind: "done", ...data });
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    }

    async function runStream() {
      try {
        const res = await fetch(`/api/horoscopes/${kind}/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileId }),
        });
        if (!res.ok || !res.body) {
          await fallbackToGet();
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let charCount = 0;
        let streamErr: string | null = null;
        let receivedDone = false;
        outer: while (!cancelled) {
          const { value, done: streamDone } = await reader.read();
          if (streamDone) break;
          buf += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf("\n\n")) >= 0) {
            const block = buf.slice(0, nl);
            buf = buf.slice(nl + 2);
            const dataLine = block.split("\n").find((l) => l.startsWith("data: "));
            if (!dataLine) continue;
            let ev: StreamFrame | null = null;
            try {
              ev = JSON.parse(dataLine.slice(6)) as StreamFrame;
            } catch (err) {
              if (!cancelled) console.warn("[streaming-prediction] event JSON parse failed", err);
              continue;
            }
            if (ev.kind === "delta") {
              charCount += ev.text.length;
              setStreamingChars(charCount);
            } else if (ev.kind === "error") {
              streamErr = ev.message;
              break outer;
            } else if (ev.kind === "done") {
              if (!cancelled) setDone(ev);
              receivedDone = true;
              break outer;
            }
          }
        }
        if (cancelled) return;
        if (streamErr) {
          console.warn("[streaming-prediction] stream emitted error, falling back to GET", streamErr);
          await fallbackToGet();
          return;
        }
        if (!receivedDone) {
          await fallbackToGet();
        }
      } catch (err) {
        if (cancelled) return;
        console.warn("[streaming-prediction] stream failed, falling back", err);
        await fallbackToGet();
      }
    }

    runStream();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, profileId]);

  if (error) {
    return (
      <Card>
        <h3 className="font-semibold text-[var(--color-brand-rose)] text-sm mb-1">
          Could not load this prediction
        </h3>
        <p className="text-white/70 text-sm">{error}</p>
      </Card>
    );
  }

  if (!done) {
    return (
      <Card>
        <p className="text-white/60 text-sm">
          Composing your reading{streamingChars > 0 ? ` — ${streamingChars} chars received` : "…"}
        </p>
      </Card>
    );
  }

  const start = new Date(done.generatedAt);
  // Period end is computed server-side; the cache-fallback also returns
  // generatedAt only. Use that single date for both ends to keep the
  // existing range label format from breaking.
  const rangeLabel = rangeLabelFor(start, start);
  const provider = done.provider && done.model ? `${done.provider} · ${done.model}${done.cached ? " · cached" : ""}` : null;

  return (
    <PredictionBody
      headline={done.payload.headline}
      body={done.payload.body}
      domains={done.payload.domains}
      displayFacts={done.displayFacts}
      rangeLabel={rangeLabel}
      provider={provider}
    />
  );
}
