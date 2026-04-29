import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireRole } from "@/backend/auth/requireRole";
import { apiError, validationError } from "@/backend/utils/api.util";
import { listAuditLogs } from "@/backend/services/audit.service";

const QuerySchema = z.object({
  kind: z.string().min(1).max(120).optional(),
  actorUserId: z.string().min(1).max(60).optional(),
  resourceType: z.string().min(1).max(60).optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireRole("ADMIN");
    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      kind: url.searchParams.get("kind") ?? undefined,
      actorUserId: url.searchParams.get("actorUserId") ?? undefined,
      resourceType: url.searchParams.get("resourceType") ?? undefined,
      fromDate: url.searchParams.get("fromDate") ?? undefined,
      toDate: url.searchParams.get("toDate") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      offset: url.searchParams.get("offset") ?? undefined,
    });
    if (!parsed.success) return validationError(parsed.error);
    const result = await listAuditLogs({
      kind: parsed.data.kind,
      actorUserId: parsed.data.actorUserId,
      resourceType: parsed.data.resourceType,
      fromDate: parsed.data.fromDate ? new Date(parsed.data.fromDate) : undefined,
      toDate: parsed.data.toDate ? new Date(parsed.data.toDate) : undefined,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    });
    return NextResponse.json(result);
  } catch (err) {
    return apiError(err);
  }
}
