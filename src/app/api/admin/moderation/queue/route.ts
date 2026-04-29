import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireRole } from "@/backend/auth/requireRole";
import { apiError, validationError } from "@/backend/utils/api.util";
import { listModerationQueue } from "@/backend/services/moderation.service";

const QuerySchema = z.object({
  kind: z.enum(["POSTS", "COMMENTS", "USERS"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN", "MODERATOR");
    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      kind: url.searchParams.get("kind") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      offset: url.searchParams.get("offset") ?? undefined,
    });
    if (!parsed.success) return validationError(parsed.error);
    const result = await listModerationQueue(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    return apiError(err);
  }
}
