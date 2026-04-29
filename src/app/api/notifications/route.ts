import { NextRequest, NextResponse } from "next/server";

import { getAuthedUser } from "@/backend/auth/getAuthedUser";
import { listForUser } from "@/backend/services/notification.service";

export async function GET(req: NextRequest) {
  const me = await getAuthedUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const unread = url.searchParams.get("unread") === "true";
  const limit = Number(url.searchParams.get("limit") ?? 25);
  const offset = Number(url.searchParams.get("offset") ?? 0);
  const data = await listForUser(me.userId, { unread, limit, offset });
  return NextResponse.json(data);
}
