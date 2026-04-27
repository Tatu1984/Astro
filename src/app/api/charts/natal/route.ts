import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { ComputeError, resolveNatal } from "@/backend/services/chart.service";
import { NatalRequestSchema } from "@/backend/validators/chart.validator";

const BodySchema = NatalRequestSchema.extend({
  profile_id: z.string().cuid().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation failed", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const { profile_id, ...request } = parsed.data;

  try {
    const { chart, cached } = await resolveNatal({
      userId: session.user.id,
      profileId: profile_id ?? null,
      request,
    });
    return NextResponse.json({ chart, cached });
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
