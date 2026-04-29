import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireRole } from "@/backend/auth/requireRole";
import { apiError, readJson, validationError } from "@/backend/utils/api.util";
import { deleteFlag, getFlag, updateFlag } from "@/backend/services/feature-flag.service";
import { writeAudit } from "@/backend/services/audit.service";

const PatchSchema = z
  .object({
    description: z.string().trim().max(500).nullable().optional(),
    enabled: z.boolean().optional(),
    rolloutPct: z.number().int().min(0).max(100).optional(),
  })
  .refine(
    (v) => v.description !== undefined || v.enabled !== undefined || v.rolloutPct !== undefined,
    "no fields to update",
  );

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireRole("ADMIN");
    const { id } = await ctx.params;
    const body = await readJson(req);
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const before = await getFlag(id);
    const flag = await updateFlag(id, parsed.data);
    await writeAudit({
      kind: "FEATURE_FLAG_CHANGED",
      actorUserId: me.userId,
      resourceType: "feature_flag",
      resourceId: flag.id,
      payload: {
        key: flag.key,
        before: before
          ? { enabled: before.enabled, rolloutPct: before.rolloutPct, description: before.description }
          : null,
        after: { enabled: flag.enabled, rolloutPct: flag.rolloutPct, description: flag.description },
      },
    });
    return NextResponse.json({ flag });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireRole("ADMIN");
    const { id } = await ctx.params;
    const flag = await deleteFlag(id);
    await writeAudit({
      kind: "FEATURE_FLAG_DELETED",
      actorUserId: me.userId,
      resourceType: "feature_flag",
      resourceId: flag.id,
      payload: { key: flag.key },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
