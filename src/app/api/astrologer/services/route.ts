import { NextResponse, type NextRequest } from "next/server";

import { requireRole } from "@/backend/auth/requireRole";
import { apiError, readJson, validationError } from "@/backend/utils/api.util";
import {
  createService,
  listOwnServices,
  requireOwnAstrologerProfile,
} from "@/backend/services/marketplace.service";
import { CreateServiceSchema } from "@/backend/validators/marketplace.validator";

export async function GET() {
  try {
    const me = await requireRole("ASTROLOGER", "ADMIN");
    const profile = await requireOwnAstrologerProfile(me.userId);
    const services = await listOwnServices(profile.id);
    return NextResponse.json({ services });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await requireRole("ASTROLOGER", "ADMIN");
    const profile = await requireOwnAstrologerProfile(me.userId);
    const body = await readJson(req);
    const parsed = CreateServiceSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const service = await createService(profile.id, parsed.data);
    return NextResponse.json({ service }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
