import { NextResponse, type NextRequest } from "next/server";

import { requireRole } from "@/backend/auth/requireRole";
import { apiError, readJson, validationError } from "@/backend/utils/api.util";
import {
  deleteService,
  requireOwnAstrologerProfile,
  updateService,
} from "@/backend/services/marketplace.service";
import { UpdateServiceSchema } from "@/backend/validators/marketplace.validator";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireRole("ASTROLOGER", "ADMIN");
    const profile = await requireOwnAstrologerProfile(me.userId);
    const { id } = await ctx.params;
    const body = await readJson(req);
    const parsed = UpdateServiceSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const service = await updateService(profile.id, id, parsed.data);
    return NextResponse.json({ service });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireRole("ASTROLOGER", "ADMIN");
    const profile = await requireOwnAstrologerProfile(me.userId);
    const { id } = await ctx.params;
    await deleteService(profile.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
