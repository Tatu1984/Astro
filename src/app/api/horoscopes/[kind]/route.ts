import { NextRequest, NextResponse } from "next/server";

import { getAuthedUser } from "@/backend/auth/getAuthedUser";
import { HoroscopeError, resolveHoroscope, type ResolveHoroscopeKind } from "@/backend/services/horoscope.service";
import { LlmError } from "@/backend/services/llm/types";

const KINDS: ReadonlyArray<ResolveHoroscopeKind> = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ kind: string }> },
) {
  const me = await getAuthedUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { kind: rawKind } = await params;
  const kind = rawKind.toUpperCase() as ResolveHoroscopeKind;
  if (!KINDS.includes(kind)) {
    return NextResponse.json({ error: `unknown kind '${rawKind}'` }, { status: 400 });
  }

  const profileId = req.nextUrl.searchParams.get("profileId");
  if (!profileId) return NextResponse.json({ error: "profileId required" }, { status: 400 });

  try {
    const result = await resolveHoroscope({ userId: me.userId, profileId, kind });
    return NextResponse.json({
      kind,
      cached: result.cached,
      payload: result.payload,
      generatedAt: result.prediction.createdAt,
      provider: result.prediction.llmProvider,
      model: result.prediction.llmModel,
    });
  } catch (err) {
    if (err instanceof HoroscopeError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof LlmError) {
      return NextResponse.json({ error: err.message, provider: err.provider }, { status: err.status });
    }
    return NextResponse.json(
      { error: "internal error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
