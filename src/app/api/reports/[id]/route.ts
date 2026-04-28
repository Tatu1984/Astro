import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { deleteReport, getReport, ReportError } from "@/backend/services/report.service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const report = await getReport(session.user.id, id);
    return NextResponse.json({ report });
  } catch (err) {
    if (err instanceof ReportError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    await deleteReport(session.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ReportError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
