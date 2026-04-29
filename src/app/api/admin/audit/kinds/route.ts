import { NextResponse } from "next/server";

import { requireRole } from "@/backend/auth/requireRole";
import { apiError } from "@/backend/utils/api.util";
import { listAuditKinds, listAuditResourceTypes } from "@/backend/services/audit.service";

export async function GET() {
  try {
    await requireRole("ADMIN");
    const [kinds, resourceTypes] = await Promise.all([listAuditKinds(), listAuditResourceTypes()]);
    return NextResponse.json({ kinds, resourceTypes });
  } catch (err) {
    return apiError(err);
  }
}
