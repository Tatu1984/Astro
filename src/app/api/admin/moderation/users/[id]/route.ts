import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireRole } from "@/backend/auth/requireRole";
import { apiError, readJson, validationError } from "@/backend/utils/api.util";
import { banUser, unbanUser } from "@/backend/services/moderation.service";

const BodySchema = z.object({
  action: z.enum(["BAN_24H", "BAN_PERM", "UNBAN"]),
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
      action === "BAN_24H"
        ? await banUser(me.userId, id, 24, reason)
        : action === "BAN_PERM"
          ? await banUser(me.userId, id, 0, reason)
          : await unbanUser(me.userId, id, reason);
    return NextResponse.json(result);
  } catch (err) {
    return apiError(err);
  }
}
