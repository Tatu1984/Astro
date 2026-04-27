import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { GeocodeError, geocode } from "@/backend/utils/geocode.util";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }

  try {
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
