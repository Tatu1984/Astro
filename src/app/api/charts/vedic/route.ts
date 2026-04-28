import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { resolveVedic, VedicError } from "@/backend/services/vedic.service";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const profileId = req.nextUrl.searchParams.get("profileId");
  if (!profileId) return NextResponse.json({ error: "profileId required" }, { status: 400 });

  try {
    const vedic = await resolveVedic({ userId: session.user.id, profileId });
    return NextResponse.json(vedic);
  } catch (err) {
    if (err instanceof VedicError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "internal error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
