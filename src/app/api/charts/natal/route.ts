import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { computeNatal, ComputeError } from "@/backend/services/chart.service";
import { NatalRequestSchema } from "@/backend/validators/chart.validator";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const parsed = NatalRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation failed", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const chart = await computeNatal(parsed.data);
    return NextResponse.json(chart);
  } catch (err) {
    if (err instanceof ComputeError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "internal error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
