import { NextResponse } from "next/server";

import { getAuthedUser } from "@/backend/auth/getAuthedUser";
import { unreadCount } from "@/backend/services/notification.service";

export async function GET() {
  const me = await getAuthedUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const count = await unreadCount(me.userId);
  return NextResponse.json({ count });
}
