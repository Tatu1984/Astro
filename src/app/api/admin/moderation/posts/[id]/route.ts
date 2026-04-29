import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireRole } from "@/backend/auth/requireRole";
import { apiError, readJson, validationError } from "@/backend/utils/api.util";
import { deletePost, hidePost, restorePost } from "@/backend/services/moderation.service";

const BodySchema = z.object({
  action: z.enum(["HIDE", "DELETE", "RESTORE"]),
  reason: z.string().trim().max(500).optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireRole("ADMIN", "MODERATOR");
    const { id } = await ctx.params;
    const body = await readJson(req);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const { action, reason } = parsed.data;
    const result =
      action === "HIDE"
        ? await hidePost(me.userId, id, reason)
        : action === "DELETE"
          ? await deletePost(me.userId, id, reason)
          : await restorePost(me.userId, id, reason);
    return NextResponse.json(result);
  } catch (err) {
    return apiError(err);
  }
}
