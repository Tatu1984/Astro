import { NextResponse, type NextRequest } from "next/server";

import { apiError } from "@/backend/utils/api.util";
import { listPublicAstrologers } from "@/backend/services/marketplace.service";
import { ConsultDirectoryQuerySchema } from "@/backend/validators/marketplace.validator";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const params: Record<string, string | undefined> = {};
    for (const [k, v] of url.searchParams.entries()) params[k] = v;
    const parsed = ConsultDirectoryQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid query" }, { status: 400 });
    }
    const astrologers = await listPublicAstrologers(parsed.data);
    return NextResponse.json({ astrologers });
  } catch (err) {
    return apiError(err);
  }
}
