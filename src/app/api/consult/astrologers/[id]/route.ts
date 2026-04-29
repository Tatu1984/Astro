import { NextResponse, type NextRequest } from "next/server";

import { apiError } from "@/backend/utils/api.util";
import { getPublicAstrologer } from "@/backend/services/marketplace.service";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const astrologer = await getPublicAstrologer(id);
    if (!astrologer) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ astrologer });
  } catch (err) {
    return apiError(err);
  }
}
