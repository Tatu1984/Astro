import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { AstrologerError, setAstrologerStatus } from "@/backend/services/astrologer.service";

const BodySchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

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

  const { id } = await params;

  try {
    const profile = await setAstrologerStatus(id, parsed.data.status);
    return NextResponse.json({ profile });
  } catch (err) {
    if (err instanceof AstrologerError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "internal error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
