import { NextRequest } from "next/server";
import { z } from "zod";

import { getAuthedUser } from "@/backend/auth/getAuthedUser";
import { resolveHoroscopeStream, type ResolveHoroscopeKind } from "@/backend/services/horoscope.service";
import type { ChatStreamEvent } from "@/shared/types/chat";

const KINDS: ReadonlyArray<ResolveHoroscopeKind> = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"];

const BodySchema = z.object({
  profileId: z.string().min(1),
  forDate: z.string().datetime().optional(),
});

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

interface HoroscopeDoneEvent {
  kind: "done";
  cached: boolean;
  payload: unknown;
  displayFacts: unknown[];
  provider: string | null;
  model: string | null;
  generatedAt: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ kind: string }> },
) {
  const me = await getAuthedUser();
  if (!me) return jsonError("unauthorized", 401);

  const { kind: rawKind } = await params;
  const kind = rawKind.toUpperCase() as ResolveHoroscopeKind;
  if (!KINDS.includes(kind)) return jsonError(`unknown kind '${rawKind}'`, 400);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("invalid JSON body", 400);
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "validation failed", details: z.treeifyError(parsed.error) }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { profileId, forDate } = parsed.data;
  const userId = me.userId;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: ChatStreamEvent | HoroscopeDoneEvent) => {
        const k = (event as { kind: string }).kind;
        controller.enqueue(encoder.encode(`event: ${k}\ndata: ${JSON.stringify(event)}\n\n`));
      };

      try {
        const events = resolveHoroscopeStream({
          userId,
          profileId,
          kind,
          forDate: forDate ? new Date(forDate) : undefined,
        });
        for await (const ev of events) {
          if (ev.kind === "delta") {
            sendEvent({ kind: "delta", text: ev.text });
          } else if (ev.kind === "done") {
            sendEvent({
              kind: "done",
              cached: ev.cached,
              payload: ev.payload,
              displayFacts: ev.displayFacts,
              provider: ev.provider,
              model: ev.model,
              generatedAt: ev.generatedAt,
            });
          } else {
            sendEvent({ kind: "error", message: ev.message });
            break;
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        sendEvent({ kind: "error", message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
