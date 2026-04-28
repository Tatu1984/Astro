import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import {
  CompatibilityError,
  listCompatibilities,
  resolveCompatibility,
} from "@/backend/services/synastry.service";
import { LlmError } from "@/backend/services/llm/types";

const PostBody = z.object({
  profileAId: z.string().cuid(),
  profileBId: z.string().cuid(),
  kind: z.enum(["ROMANTIC", "FRIENDSHIP", "BUSINESS", "FAMILY"]).default("ROMANTIC"),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const compatibilities = await listCompatibilities(session.user.id);
  return NextResponse.json({ compatibilities });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const parsed = PostBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation failed", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const result = await resolveCompatibility({
      userId: session.user.id,
      profileAId: parsed.data.profileAId,
      profileBId: parsed.data.profileBId,
      kind: parsed.data.kind,
    });
    return NextResponse.json(result, { status: result.cached ? 200 : 201 });
  } catch (err) {
    if (err instanceof CompatibilityError) {
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
