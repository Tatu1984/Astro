import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { GeocodeError, geocode, searchPlaces } from "@/backend/utils/geocode.util";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }

  // ?multi=1 returns up to 5 matches for autocomplete; default keeps the
  // single-result legacy shape used elsewhere.
  const multi = req.nextUrl.searchParams.get("multi") === "1";

  try {
    if (multi) {
      const results = await searchPlaces(q, 5);
      return NextResponse.json({ results });
    }
    const result = await geocode(q);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof GeocodeError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "geocode failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
