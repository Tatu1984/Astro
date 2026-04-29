import { NextResponse } from "next/server";

import { getAuthedUser } from "@/backend/auth/getAuthedUser";
import { writeAudit } from "@/backend/services/audit.service";
import { signOutEverywhere } from "@/backend/services/settings.service";

export async function POST() {
  const me = await getAuthedUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await signOutEverywhere(me.userId);
  await writeAudit({
    kind: "USER_SIGN_OUT_EVERYWHERE",
    actorUserId: me.userId,
    resourceType: "user",
    resourceId: me.userId,
    payload: { revoked: result.revoked },
  });
  return NextResponse.json(result);
}
