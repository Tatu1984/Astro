import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { HoroscopeError, resolveDailyHoroscope } from "@/backend/services/horoscope.service";
import { LlmError } from "@/backend/services/llm/types";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const profileId = req.nextUrl.searchParams.get("profileId");
  if (!profileId) return NextResponse.json({ error: "profileId required" }, { status: 400 });

  try {
    const result = await resolveDailyHoroscope({ userId: session.user.id, profileId });
    return NextResponse.json({
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
