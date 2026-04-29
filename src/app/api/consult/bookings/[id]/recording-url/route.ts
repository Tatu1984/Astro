import { NextRequest, NextResponse } from "next/server";

import { getAuthedUser } from "@/backend/auth/getAuthedUser";
import { prisma } from "@/backend/database/client";
import { getSignedUrl } from "@/backend/services/storage.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await getAuthedUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      consultSession: { select: { recordingUrl: true } },
      astrologerProfile: { select: { userId: true } },
    },
  });
  if (!booking) return NextResponse.json({ error: "booking not found" }, { status: 404 });
  const isOwner =
    booking.userId === me.userId ||
    booking.astrologerProfile.userId === me.userId ||
    me.role === "ADMIN";
  if (!isOwner) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!booking.consultSession?.recordingUrl) {
    return NextResponse.json({ error: "no recording" }, { status: 404 });
  }
  const url = await getSignedUrl(booking.consultSession.recordingUrl, 900);
  return NextResponse.json({ url, expiresInSec: 900 });
}
