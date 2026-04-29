import { NextResponse, type NextRequest } from "next/server";

import { requireAuth } from "@/backend/auth/requireRole";
import { apiError, readJson, validationError } from "@/backend/utils/api.util";
import { submitReview } from "@/backend/services/review.service";
import { ReviewSubmitSchema } from "@/backend/validators/marketplace.validator";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireAuth();
    const { id } = await ctx.params;
    const body = await readJson(req);
    const parsed = ReviewSubmitSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const review = await submitReview({
      bookingId: id,
      userId: me.userId,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    });
    return NextResponse.json({ review }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
