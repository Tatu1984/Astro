import { NextResponse } from "next/server";

import { authErrorResponse, requireAuth } from "@/backend/auth/requireRole";
import { prisma } from "@/backend/database/client";
import { getReport, ReportError } from "@/backend/services/report.service";
import { renderReportPdfBuffer } from "@/backend/services/pdf.service";
import {
  getSignedUrl,
  uploadObject,
} from "@/backend/services/storage.service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let me;
  try {
    me = await requireAuth();
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
  const { id } = await params;
  try {
    const report = await getReport(me.userId, id);
    const user = await prisma.user.findUnique({
      where: { id: me.userId },
      select: { name: true },
    });
    const buf = await renderReportPdfBuffer({ report, ownerName: user?.name ?? null });
    const key = `reports/${me.userId}/${report.id}.pdf`;
    await uploadObject({
      key,
      body: buf,
      contentType: "application/pdf",
      contentLength: buf.byteLength,
      metadata: { kind: report.kind, userId: me.userId },
    });
    const url = await getSignedUrl(key, 60 * 60);
    return NextResponse.json({ url, key, sizeBytes: buf.byteLength });
  } catch (err) {
    if (err instanceof ReportError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "internal error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
