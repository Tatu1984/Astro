import { NextResponse, type NextRequest } from "next/server";

import { requireAuth } from "@/backend/auth/requireRole";
import { apiError } from "@/backend/utils/api.util";
import { prisma } from "@/backend/database/client";
import { createMeetingToken, createRoom } from "@/backend/services/consult.service";
import { env } from "@/config/env";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireAuth();
    const { id } = await ctx.params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { consultSession: true },
    });
    if (!booking) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (booking.userId !== me.userId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (booking.status !== "CONFIRMED" && booking.status !== "IN_PROGRESS") {
      return NextResponse.json({ error: `booking status is ${booking.status}` }, { status: 400 });
    }

    const now = Date.now();
    const scheduled = booking.scheduledAt.getTime();
    const bufferMs = env.CONSULT_BUFFER_MINUTES * 60 * 1000;
    const endMs = scheduled + (booking.durationMin + 30) * 60 * 1000;
    if (now < scheduled - bufferMs) {
      return NextResponse.json(
        { error: "join window not yet open", openAt: new Date(scheduled - bufferMs).toISOString() },
        { status: 403 },
      );
    }
    if (now > endMs) {
      return NextResponse.json({ error: "join window has closed" }, { status: 403 });
    }

    let session = booking.consultSession;
    const expiresAt = new Date(endMs);
    if (!session) {
      const room = await createRoom({ bookingId: booking.id, expiresAt });
      session = await prisma.consultSession.create({
        data: {
          bookingId: booking.id,
          dailyRoomName: room.roomName,
          dailyRoomUrl: room.roomUrl,
        },
      });
    }

    const userToken = await createMeetingToken({
      roomName: session.dailyRoomName,
      userId: me.userId,
      isOwner: false,
      expiresAt,
    });

    await prisma.consultSession.update({
      where: { id: session.id },
      data: { dailyTokenUser: userToken },
    });

    return NextResponse.json({
      roomUrl: session.dailyRoomUrl,
      roomName: session.dailyRoomName,
      token: userToken,
    });
  } catch (err) {
    return apiError(err);
  }
}
