import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { resolveNatal } from "@/backend/services/chart.service";
import { resolveNowTransits, TransitError } from "@/backend/services/transit.service";
import { prisma } from "@/backend/database/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const profileIdParam = req.nextUrl.searchParams.get("profileId");
  const profile = profileIdParam
    ? await prisma.profile.findUnique({
        where: { id: profileIdParam },
        select: {
          id: true, userId: true, birthDate: true, latitude: true, longitude: true,
        },
      })
    : await prisma.profile.findFirst({
        where: { userId: session.user.id, deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: {
          id: true, userId: true, birthDate: true, latitude: true, longitude: true,
        },
      });

  if (!profile) return NextResponse.json({ error: "no profile available" }, { status: 404 });
  if (profile.userId !== session.user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

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

    const result = await resolveNowTransits({ natal: chart, topN: 8 });
    return NextResponse.json(result);
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
