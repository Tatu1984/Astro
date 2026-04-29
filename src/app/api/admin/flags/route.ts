import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireRole } from "@/backend/auth/requireRole";
import { apiError, readJson, validationError } from "@/backend/utils/api.util";
import { createFlag, getAllFlags } from "@/backend/services/feature-flag.service";
import { writeAudit } from "@/backend/services/audit.service";

const CreateSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-zA-Z][a-zA-Z0-9._-]*$/, "key must start with a letter, alphanumeric/._- only"),
  description: z.string().trim().max(500).optional(),
  enabled: z.boolean().optional(),
  rolloutPct: z.number().int().min(0).max(100).optional(),
});

export async function GET() {
  try {
    await requireRole("ADMIN");
    const flags = await getAllFlags();
    return NextResponse.json({ flags });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await requireRole("ADMIN");
    const body = await readJson(req);
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const flag = await createFlag(parsed.data);
    await writeAudit({
      kind: "FEATURE_FLAG_CREATED",
      actorUserId: me.userId,
      resourceType: "feature_flag",
      resourceId: flag.id,
      payload: {
        key: flag.key,
        enabled: flag.enabled,
        rolloutPct: flag.rolloutPct,
      },
    });
    return NextResponse.json({ flag });
  } catch (err) {
    return apiError(err);
  }
}
