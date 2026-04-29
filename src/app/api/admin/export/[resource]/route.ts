import { NextResponse, type NextRequest } from "next/server";

import { requireRole } from "@/backend/auth/requireRole";
import { apiError } from "@/backend/utils/api.util";
import { prisma } from "@/backend/database/client";
import { toCsv, type CsvCell } from "@/shared/csv";

const VALID_RESOURCES = new Set([
  "users",
  "astrologers",
  "bookings",
  "reviews",
  "payouts",
  "llm-calls",
]);

const MAX_ROWS = 50_000;

interface BuildResult {
  headers: string[];
  rows: CsvCell[][];
}

function todayStr(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ resource: string }> }) {
  try {
    await requireRole("ADMIN");
    const { resource } = await ctx.params;
    if (!VALID_RESOURCES.has(resource)) {
      return NextResponse.json({ error: `unknown resource '${resource}'` }, { status: 404 });
    }
    const url = new URL(req.url);
    const includePii = url.searchParams.get("includePii") === "true";
    const fromStr = url.searchParams.get("from");
    const toStr = url.searchParams.get("to");
    const fromDate = fromStr ? new Date(fromStr) : undefined;
    const toDate = toStr ? new Date(toStr) : undefined;

    const built = await build(resource, { includePii, fromDate, toDate });
    if (!built) return NextResponse.json({ error: "build failed" }, { status: 500 });

    const csv = toCsv(built.headers, built.rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${resource}-${todayStr()}.csv"`,
      },
    });
  } catch (err) {
    return apiError(err);
  }
}

async function checkCount(promise: Promise<number>): Promise<number> {
  const n = await promise;
  if (n > MAX_ROWS) {
    throw {
      status: 422,
      message: `${n} rows exceeds cap ${MAX_ROWS}; filter by date range with ?from=...&to=...`,
    };
  }
  return n;
}

async function build(
  resource: string,
  opts: { includePii: boolean; fromDate?: Date; toDate?: Date },
): Promise<BuildResult | null> {
  const dateRange =
    opts.fromDate || opts.toDate
      ? {
          ...(opts.fromDate ? { gte: opts.fromDate } : {}),
          ...(opts.toDate ? { lte: opts.toDate } : {}),
        }
      : undefined;

  if (resource === "users") {
    await checkCount(prisma.user.count({ where: dateRange ? { createdAt: dateRange } : undefined }));
    const rows = await prisma.user.findMany({
      where: dateRange ? { createdAt: dateRange } : undefined,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: opts.includePii,
        name: opts.includePii,
        phone: opts.includePii,
        role: true,
        createdAt: true,
        bannedUntil: true,
        deletedAt: true,
      },
    });
    const headers = ["id", "role", "createdAt", "bannedUntil", "deletedAt"];
    if (opts.includePii) headers.splice(1, 0, "email", "name", "phone");
    return {
      headers,
      rows: rows.map((u) => {
        const base: CsvCell[] = [u.id];
        if (opts.includePii) base.push(u.email ?? "", u.name ?? "", u.phone ?? "");
        base.push(u.role, u.createdAt, u.bannedUntil, u.deletedAt);
        return base;
      }),
    };
  }

  if (resource === "astrologers") {
    await checkCount(
      prisma.astrologerProfile.count({ where: dateRange ? { createdAt: dateRange } : undefined }),
    );
    const rows = await prisma.astrologerProfile.findMany({
      where: dateRange ? { createdAt: dateRange } : undefined,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true } } },
    });
    const headers = [
      "id",
      "userId",
      "fullName",
      "city",
      "state",
      "country",
      "status",
      "onboardingStep",
      "averageRating",
      "ratingCount",
      "createdAt",
    ];
    if (opts.includePii) headers.push("email", "phone", "kycType", "kycNumber", "bankAccountNumber", "bankIfsc", "upiId");
    return {
      headers,
      rows: rows.map((a) => {
        const base: CsvCell[] = [
          a.id,
          a.userId,
          a.fullName,
          a.city,
          a.state,
          a.country,
          a.status,
          a.onboardingStep,
          a.averageRating,
          a.ratingCount,
          a.createdAt,
        ];
        if (opts.includePii) {
          base.push(
            a.user.email ?? "",
            a.phone,
            a.kycType,
            a.kycNumber,
            a.bankAccountNumber ?? "",
            a.bankIfsc ?? "",
            a.upiId ?? "",
          );
        }
        return base;
      }),
    };
  }

  if (resource === "bookings") {
    await checkCount(
      prisma.booking.count({ where: dateRange ? { createdAt: dateRange } : undefined }),
    );
    const rows = await prisma.booking.findMany({
      where: dateRange ? { createdAt: dateRange } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        service: { select: { title: true, kind: true } },
        astrologerProfile: { select: { fullName: true } },
        user: { select: { email: true } },
      },
    });
    const headers = [
      "id",
      "userId",
      "astrologerProfileId",
      "astrologerName",
      "serviceTitle",
      "serviceKind",
      "scheduledAt",
      "durationMin",
      "status",
      "priceInr",
      "platformFeeInr",
      "astrologerNetInr",
      "razorpayOrderId",
      "razorpayPaymentId",
      "createdAt",
      "completedAt",
      "cancelledAt",
    ];
    if (opts.includePii) headers.push("userEmail");
    return {
      headers,
      rows: rows.map((b) => {
        const base: CsvCell[] = [
          b.id,
          b.userId,
          b.astrologerProfileId,
          b.astrologerProfile.fullName,
          b.service.title,
          b.service.kind,
          b.scheduledAt,
          b.durationMin,
          b.status,
          b.priceInr,
          b.platformFeeInr,
          b.astrologerNetInr,
          b.razorpayOrderId ?? "",
          b.razorpayPaymentId ?? "",
          b.createdAt,
          b.completedAt,
          b.cancelledAt,
        ];
        if (opts.includePii) base.push(b.user.email ?? "");
        return base;
      }),
    };
  }

  if (resource === "reviews") {
    await checkCount(
      prisma.review.count({ where: dateRange ? { createdAt: dateRange } : undefined }),
    );
    const rows = await prisma.review.findMany({
      where: dateRange ? { createdAt: dateRange } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        astrologerProfile: { select: { fullName: true } },
      },
    });
    const headers = [
      "id",
      "bookingId",
      "userId",
      "astrologerProfileId",
      "astrologerName",
      "rating",
      "comment",
      "createdAt",
    ];
    return {
      headers,
      rows: rows.map((r) => [
        r.id,
        r.bookingId,
        r.userId,
        r.astrologerProfileId,
        r.astrologerProfile.fullName,
        r.rating,
        r.comment ?? "",
        r.createdAt,
      ]),
    };
  }

  if (resource === "payouts") {
    await checkCount(
      prisma.payout.count({ where: dateRange ? { requestedAt: dateRange } : undefined }),
    );
    const rows = await prisma.payout.findMany({
      where: dateRange ? { requestedAt: dateRange } : undefined,
      orderBy: { requestedAt: "desc" },
      include: { astrologerProfile: { select: { fullName: true } } },
    });
    const headers = [
      "id",
      "astrologerProfileId",
      "astrologerName",
      "amountInr",
      "status",
      "razorpayPayoutId",
      "requestedAt",
      "completedAt",
      "processedByUserId",
    ];
    return {
      headers,
      rows: rows.map((p) => [
        p.id,
        p.astrologerProfileId,
        p.astrologerProfile.fullName,
        p.amountInr,
        p.status,
        p.razorpayPayoutId ?? "",
        p.requestedAt,
        p.completedAt,
        p.processedByUserId ?? "",
      ]),
    };
  }

  if (resource === "llm-calls") {
    await checkCount(
      prisma.llmCallLog.count({ where: dateRange ? { createdAt: dateRange } : undefined }),
    );
    const rows = await prisma.llmCallLog.findMany({
      where: dateRange ? { createdAt: dateRange } : undefined,
      orderBy: { createdAt: "desc" },
    });
    const headers = [
      "id",
      "createdAt",
      "route",
      "provider",
      "model",
      "inputTokens",
      "outputTokens",
      "costUsdMicro",
      "latencyMs",
      "status",
      "error",
    ];
    if (opts.includePii) headers.push("userId");
    return {
      headers,
      rows: rows.map((c) => {
        const base: CsvCell[] = [
          c.id,
          c.createdAt,
          c.route,
          c.provider,
          c.model,
          c.inputTokens,
          c.outputTokens,
          c.costUsdMicro,
          c.latencyMs,
          c.status,
          c.error ?? "",
        ];
        if (opts.includePii) base.push(c.userId ?? "");
        return base;
      }),
    };
  }

  return null;
}
