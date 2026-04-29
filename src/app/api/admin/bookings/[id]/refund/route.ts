import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireRole } from "@/backend/auth/requireRole";
import { apiError, readJson, validationError } from "@/backend/utils/api.util";
import { refundBooking } from "@/backend/services/refund.service";

const BodySchema = z.object({
  amountInr: z.number().int().positive().optional(),
  reason: z.string().trim().min(1).max(500),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireRole("ADMIN");
    const { id } = await ctx.params;
    const body = await readJson(req);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const result = await refundBooking({
      bookingId: id,
      actorUserId: me.userId,
      amountInr: parsed.data.amountInr,
      reason: parsed.data.reason,
    });

    if ("alreadyRefunded" in result && result.alreadyRefunded) {
      return NextResponse.json(result, { status: 409 });
    }
    return NextResponse.json(result);
  } catch (err) {
    return apiError(err);
  }
}
