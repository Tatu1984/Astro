import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireRole } from "@/backend/auth/requireRole";
import { apiError, readJson, validationError } from "@/backend/utils/api.util";
import { prisma } from "@/backend/database/client";
import { creditEarning } from "@/backend/services/wallet.service";
import { requireOwnAstrologerProfile } from "@/backend/services/marketplace.service";

const CompleteSchema = z.object({
  notes: z.string().max(10000).optional(),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireRole("ASTROLOGER", "ADMIN");
    const profile = await requireOwnAstrologerProfile(me.userId);
    const { id } = await ctx.params;

    const body = await readJson(req);
    const parsed = CompleteSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { consultSession: true },
    });
    if (!booking) return NextResponse.json({ error: "booking not found" }, { status: 404 });
    if (booking.astrologerProfileId !== profile.id) {
      return NextResponse.json({ error: "not your booking" }, { status: 403 });
    }
    if (booking.status !== "IN_PROGRESS" && booking.status !== "CONFIRMED") {
      return NextResponse.json({ error: `booking status is ${booking.status}` }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      if (booking.consultSession) {
        const startedAt = booking.consultSession.startedAt ?? new Date();
        const endedAt = new Date();
        const durationActualSec = Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));
        await tx.consultSession.update({
          where: { id: booking.consultSession.id },
          data: { endedAt, durationActualSec, astrologerNotes: parsed.data.notes },
        });
      }
      const updated = await tx.booking.update({
        where: { id: booking.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      await creditEarning(profile.id, booking.id, booking.astrologerNetInr, tx);
      return updated;
    });

    return NextResponse.json({ booking: result });
  } catch (err) {
    return apiError(err);
  }
}
