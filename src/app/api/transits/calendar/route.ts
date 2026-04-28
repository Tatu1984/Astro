import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { resolveNatal } from "@/backend/services/chart.service";
import { buildCalendar, TransitError } from "@/backend/services/transit.service";
import { prisma } from "@/backend/database/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const days = Math.min(180, Math.max(7, Number(req.nextUrl.searchParams.get("days") ?? "60")));

  const profile = await prisma.profile.findFirst({
    where: { userId: session.user.id, deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, birthDate: true, latitude: true, longitude: true },
  });
  if (!profile) return NextResponse.json({ error: "no profile available" }, { status: 404 });

  try {
    const { chart } = await resolveNatal({
      userId: session.user.id,
      profileId: profile.id,
      request: {
        birth_datetime_utc: profile.birthDate.toISOString(),
        latitude: Number(profile.latitude),
        longitude: Number(profile.longitude),
        house_system: "PLACIDUS",
        system: "BOTH",
      },
    });
    const cal = await buildCalendar({ natal: chart, daysAhead: days });
    return NextResponse.json(cal);
  } catch (err) {
    if (err instanceof TransitError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "internal error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
