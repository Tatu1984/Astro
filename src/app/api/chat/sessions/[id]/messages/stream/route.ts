import { NextRequest } from "next/server";
import { z } from "zod";

import { getAuthedUser } from "@/backend/auth/getAuthedUser";
import { sendMessageStream } from "@/backend/services/chat.service";
import type { ChatStreamEvent } from "@/shared/types/chat";

const BodySchema = z.object({
  content: z.string().min(1).max(4000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await getAuthedUser();
  if (!me) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "validation failed", details: z.treeifyError(parsed.error) }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { id } = await params;
  const userId = me.userId;
  const content = parsed.data.content;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ChatStreamEvent) => {
        controller.enqueue(encoder.encode(`event: ${event.kind}\ndata: ${JSON.stringify(event)}\n\n`));
      };

      try {
        const events = sendMessageStream({ userId, sessionId: id, content });
        for await (const ev of events) {
          if (ev.type === "chunk") {
            send({ kind: "delta", type: "chunk", text: ev.text });
          } else if (ev.type === "done") {
            send({
              kind: "done",
              type: "done",
              messageId: ev.assistantMessage.id,
              userMessage: ev.userMessage,
              assistantMessage: ev.assistantMessage,
            });
          } else {
            send({ kind: "error", type: "error", message: ev.error, error: ev.error });
            break;
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        send({ kind: "error", type: "error", message: msg, error: msg });
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
