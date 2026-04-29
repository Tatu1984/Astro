import { NextResponse, type NextRequest } from "next/server";

import { requireRole } from "@/backend/auth/requireRole";
import { apiError } from "@/backend/utils/api.util";
import { prisma } from "@/backend/database/client";
import { transitionStatus } from "@/backend/services/booking.service";
import { createMeetingToken, createRoom } from "@/backend/services/consult.service";
import { requireOwnAstrologerProfile } from "@/backend/services/marketplace.service";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireRole("ASTROLOGER", "ADMIN");
    const profile = await requireOwnAstrologerProfile(me.userId);
    const { id } = await ctx.params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { consultSession: true },
    });
    if (!booking) return NextResponse.json({ error: "booking not found" }, { status: 404 });
    if (booking.astrologerProfileId !== profile.id) {
      return NextResponse.json({ error: "not your booking" }, { status: 403 });
    }
    if (booking.status !== "CONFIRMED") {
      return NextResponse.json({ error: `booking status is ${booking.status}` }, { status: 400 });
    }

    let session = booking.consultSession;
    const expiresAt = new Date(booking.scheduledAt.getTime() + (booking.durationMin + 30) * 60 * 1000);

    if (!session) {
      const room = await createRoom({ bookingId: booking.id, expiresAt });
      session = await prisma.consultSession.create({
        data: {
          bookingId: booking.id,
          dailyRoomName: room.roomName,
          dailyRoomUrl: room.roomUrl,
          startedAt: new Date(),
        },
      });
    } else if (!session.startedAt) {
      session = await prisma.consultSession.update({
        where: { id: session.id },
        data: { startedAt: new Date() },
      });
    }

    const astrologerToken = await createMeetingToken({
      roomName: session.dailyRoomName,
      userId: me.userId,
      isOwner: true,
      expiresAt,
    });

    await prisma.consultSession.update({
      where: { id: session.id },
      data: { dailyTokenAstrologer: astrologerToken },
    });

    await transitionStatus(booking.id, "IN_PROGRESS");

    return NextResponse.json({
      roomUrl: session.dailyRoomUrl,
      roomName: session.dailyRoomName,
      token: astrologerToken,
    });
  } catch (err) {
    return apiError(err);
  }
}
