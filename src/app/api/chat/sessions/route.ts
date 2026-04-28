import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { ChatError, listChatSessions, startSession } from "@/backend/services/chat.service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const sessions = await listChatSessions(session.user.id);
  return NextResponse.json({ sessions });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const created = await startSession(session.user.id);
    return NextResponse.json({ session: created }, { status: 201 });
  } catch (err) {
    if (err instanceof ChatError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "internal error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
