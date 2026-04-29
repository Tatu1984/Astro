import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requireRole } from "@/backend/auth/requireRole";
import { apiError, validationError } from "@/backend/utils/api.util";
import { prisma } from "@/backend/database/client";
import type { Prisma } from "@prisma/client";

const QuerySchema = z.object({
  provider: z.string().min(1).max(40).optional(),
  model: z.string().min(1).max(80).optional(),
  surface: z.string().min(1).max(80).optional(),
  status: z.enum(["ok", "error"]).optional(),
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
      provider: url.searchParams.get("provider") ?? undefined,
      model: url.searchParams.get("model") ?? undefined,
      surface: url.searchParams.get("surface") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      fromDate: url.searchParams.get("fromDate") ?? undefined,
      toDate: url.searchParams.get("toDate") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      offset: url.searchParams.get("offset") ?? undefined,
    });
    if (!parsed.success) return validationError(parsed.error);

    const limit = parsed.data.limit ?? 50;
    const offset = parsed.data.offset ?? 0;

    const where: Prisma.LlmCallLogWhereInput = {};
    if (parsed.data.provider) where.provider = parsed.data.provider;
    if (parsed.data.model) where.model = parsed.data.model;
    if (parsed.data.surface) where.route = parsed.data.surface;
    if (parsed.data.status) where.status = parsed.data.status;
    if (parsed.data.fromDate || parsed.data.toDate) {
      where.createdAt = {};
      if (parsed.data.fromDate) where.createdAt.gte = new Date(parsed.data.fromDate);
      if (parsed.data.toDate) where.createdAt.lte = new Date(parsed.data.toDate);
    }

    const [rows, total] = await Promise.all([
      prisma.llmCallLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          userId: true,
          route: true,
          provider: true,
          model: true,
          inputTokens: true,
          outputTokens: true,
          costUsdMicro: true,
          latencyMs: true,
          status: true,
          error: true,
          createdAt: true,
        },
      }),
      prisma.llmCallLog.count({ where }),
    ]);
    return NextResponse.json({ rows, total, limit, offset });
  } catch (err) {
    return apiError(err);
  }
}
