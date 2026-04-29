import { NextResponse } from "next/server";

import { authErrorResponse, requireAuth } from "@/backend/auth/requireRole";
import { prisma } from "@/backend/database/client";
import { renderChartPdfBuffer } from "@/backend/services/pdf.service";
import {
  getSignedUrl,
  uploadObject,
} from "@/backend/services/storage.service";
import type { NatalResponse } from "@/shared/types/chart";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ chartId: string }> },
) {
  let me;
  try {
    me = await requireAuth();
  } catch (err) {
    const r = authErrorResponse(err);
    if (r) return r;
    throw err;
  }
  const { chartId } = await params;
  const chartRow = await prisma.chart.findUnique({
    where: { id: chartId },
    select: {
      id: true,
      userId: true,
      payload: true,
      profile: { select: { fullName: true, birthPlace: true } },
    },
  });
  if (!chartRow || chartRow.userId !== me.userId) {
    return NextResponse.json({ error: "chart not found" }, { status: 404 });
  }
  const chart = chartRow.payload as unknown as NatalResponse;

  try {
    const buf = await renderChartPdfBuffer({
      chart,
      ownerName: chartRow.profile?.fullName ?? null,
      birthPlace: chartRow.profile?.birthPlace ?? null,
    });
    const key = `charts/${me.userId}/${chartRow.id}.pdf`;
    await uploadObject({
      key,
      body: buf,
      contentType: "application/pdf",
      contentLength: buf.byteLength,
      metadata: { userId: me.userId, chartId: chartRow.id },
    });
    const url = await getSignedUrl(key, 60 * 60);
    return NextResponse.json({ url, key, sizeBytes: buf.byteLength });
  } catch (err) {
    return NextResponse.json(
      { error: "pdf render failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
