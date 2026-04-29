import { NextResponse, type NextRequest } from "next/server";

import { requireRole } from "@/backend/auth/requireRole";
import { apiError, readJson, validationError } from "@/backend/utils/api.util";
import {
  getSchedule,
  replaceSchedule,
  requireOwnAstrologerProfile,
} from "@/backend/services/marketplace.service";
import { ReplaceScheduleSchema } from "@/backend/validators/marketplace.validator";

export async function GET() {
  try {
    const me = await requireRole("ASTROLOGER", "ADMIN");
    const profile = await requireOwnAstrologerProfile(me.userId);
    const data = await getSchedule(profile.id);
    return NextResponse.json(data);
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const me = await requireRole("ASTROLOGER", "ADMIN");
    const profile = await requireOwnAstrologerProfile(me.userId);
    const body = await readJson(req);
    const parsed = ReplaceScheduleSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const slots = await replaceSchedule(profile.id, parsed.data);
    return NextResponse.json({ slots });
  } catch (err) {
    return apiError(err);
  }
}
