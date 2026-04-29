import { NextResponse } from "next/server";

import { getAuthedUser } from "@/backend/auth/getAuthedUser";
import { NotificationError, markRead } from "@/backend/services/notification.service";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await getAuthedUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const updated = await markRead(me.userId, id);
    return NextResponse.json({ notification: updated });
  } catch (err) {
    if (err instanceof NotificationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
