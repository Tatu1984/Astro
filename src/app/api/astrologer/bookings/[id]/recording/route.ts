import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/backend/auth/requireRole";
import { writeAudit } from "@/backend/services/audit.service";
import { prisma } from "@/backend/database/client";
import { requireOwnAstrologerProfile } from "@/backend/services/marketplace.service";
import {
  StorageError,
  deleteObject,
  uploadObject,
} from "@/backend/services/storage.service";
import { apiError } from "@/backend/utils/api.util";

const MAX_BYTES = 500 * 1024 * 1024;
const ALLOWED_MIME = ["video/mp4", "video/webm", "audio/mpeg"] as const;

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 200);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const me = await requireRole("ASTROLOGER", "ADMIN");
    const profile = await requireOwnAstrologerProfile(me.userId);
    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { consultSession: true },
    });
    if (!booking) return NextResponse.json({ error: "booking not found" }, { status: 404 });
    if (booking.astrologerProfileId !== profile.id) {
      return NextResponse.json({ error: "not your booking" }, { status: 403 });
    }
    if (!booking.consultSession) {
      return NextResponse.json({ error: "no consult session for this booking" }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "missing file" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `file too large (${file.size} > ${MAX_BYTES})` },
        { status: 413 },
      );
    }
    const contentType = file.type || "application/octet-stream";
    if (!ALLOWED_MIME.includes(contentType as (typeof ALLOWED_MIME)[number])) {
      return NextResponse.json({ error: `unsupported content type: ${contentType}` }, { status: 415 });
    }
    const safe = safeName(file.name || "recording");
    const key = `recordings/${booking.id}/${Date.now()}-${safe}`;

    const buf = Buffer.from(await file.arrayBuffer());
    await uploadObject({
      key,
      body: buf,
      contentType,
      contentLength: buf.byteLength,
      metadata: { bookingId: booking.id, astrologerProfileId: profile.id },
    });

    const oldKey = booking.consultSession.recordingUrl;
    await prisma.consultSession.update({
      where: { id: booking.consultSession.id },
      data: { recordingUrl: key },
    });
    if (oldKey && oldKey !== key) {
      await deleteObject(oldKey).catch(() => undefined);
    }

    await writeAudit({
      kind: "CONSULT_RECORDING_UPLOAD",
      actorUserId: me.userId,
      resourceType: "booking",
      resourceId: booking.id,
      payload: { key, sizeBytes: buf.byteLength, contentType },
    });

    return NextResponse.json({ ok: true, key });
  } catch (err) {
    if (err instanceof StorageError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return apiError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const me = await requireRole("ASTROLOGER", "ADMIN");
    const profile = await requireOwnAstrologerProfile(me.userId);
    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { consultSession: true },
    });
    if (!booking) return NextResponse.json({ error: "booking not found" }, { status: 404 });
    if (booking.astrologerProfileId !== profile.id) {
      return NextResponse.json({ error: "not your booking" }, { status: 403 });
    }
    if (!booking.consultSession?.recordingUrl) {
      return NextResponse.json({ error: "no recording to delete" }, { status: 404 });
    }
    const oldKey = booking.consultSession.recordingUrl;
    await prisma.consultSession.update({
      where: { id: booking.consultSession.id },
      data: { recordingUrl: null },
    });
    await deleteObject(oldKey).catch(() => undefined);
    await writeAudit({
      kind: "CONSULT_RECORDING_DELETE",
      actorUserId: me.userId,
      resourceType: "booking",
      resourceId: booking.id,
      payload: { key: oldKey },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
