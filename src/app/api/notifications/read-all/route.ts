import { NextResponse } from "next/server";

import { getAuthedUser } from "@/backend/auth/getAuthedUser";
import { markAllRead } from "@/backend/services/notification.service";

export async function POST() {
  const me = await getAuthedUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await markAllRead(me.userId);
  return NextResponse.json(result);
}
