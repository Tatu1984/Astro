import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { generateReport, listReports, ReportError } from "@/backend/services/report.service";
import { LlmError } from "@/backend/services/llm/types";

const PostBody = z.object({
  profileId: z.string().cuid(),
  kind: z.enum(["NATAL_FULL", "CAREER_WEALTH", "LOVE_MARRIAGE", "HEALTH", "EDUCATION", "SPIRITUAL"]),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const reports = await listReports(session.user.id);
  return NextResponse.json({ reports });
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
    const report = await generateReport({
      userId: session.user.id,
      profileId: parsed.data.profileId,
      kind: parsed.data.kind,
    });
    return NextResponse.json({ report }, { status: 201 });
  } catch (err) {
    if (err instanceof ReportError) {
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
