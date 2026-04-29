import { NextResponse, type NextRequest } from "next/server";

import { requireRole } from "@/backend/auth/requireRole";
import { apiError, readJson, validationError } from "@/backend/utils/api.util";
import {
  createScheduleException,
  requireOwnAstrologerProfile,
} from "@/backend/services/marketplace.service";
import { ScheduleExceptionSchema } from "@/backend/validators/marketplace.validator";

export async function POST(req: NextRequest) {
  try {
    const me = await requireRole("ASTROLOGER", "ADMIN");
    const profile = await requireOwnAstrologerProfile(me.userId);
    const body = await readJson(req);
    const parsed = ScheduleExceptionSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const exception = await createScheduleException(profile.id, parsed.data);
    return NextResponse.json({ exception }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
