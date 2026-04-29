import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAuthedUser } from "@/backend/auth/getAuthedUser";
import { resolveNatal } from "@/backend/services/chart.service";
import {
  buildTransitCalendar,
  getCachedCalendar,
  setCachedCalendar,
  TransitError,
  type CalendarEvent,
} from "@/backend/services/transit.service";
import { prisma } from "@/backend/database/client";

const BodySchema = z.object({
  profileId: z.string().cuid(),
  fromDate: z.string().datetime(),
  toDate: z.string().datetime(),
  eventTypes: z.array(z.enum(["INGRESS", "RETRO_STATION", "ASPECT_EXACT"])).optional(),
});

const MAX_RANGE_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const me = await getAuthedUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation failed", details: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const fromDate = new Date(parsed.data.fromDate);
  const toDate = new Date(parsed.data.toDate);
  if (toDate <= fromDate) {
    return NextResponse.json({ error: "toDate must be after fromDate" }, { status: 422 });
  }
  const spanDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / DAY_MS);
  if (spanDays > MAX_RANGE_DAYS) {
    return NextResponse.json(
      { error: `range too large: ${spanDays} days; max is ${MAX_RANGE_DAYS}` },
      { status: 422 },
    );
  }

  const profile = await prisma.profile.findUnique({
    where: { id: parsed.data.profileId },
    select: { id: true, userId: true, birthDate: true, latitude: true, longitude: true },
  });
  if (!profile) return NextResponse.json({ error: "profile not found" }, { status: 404 });
  if (profile.userId !== me.userId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const cacheKey = `${me.userId}|${profile.id}|${fromDate.toISOString()}|${toDate.toISOString()}`;
  let events = getCachedCalendar(cacheKey);

  if (!events) {
    try {
      const { chart } = await resolveNatal({
        userId: me.userId,
        profileId: profile.id,
        request: {
          birth_datetime_utc: profile.birthDate.toISOString(),
          latitude: Number(profile.latitude),
          longitude: Number(profile.longitude),
          house_system: "PLACIDUS",
          system: "BOTH",
        },
      });
      events = await buildTransitCalendar({ natal: chart, fromDate, toDate });
      setCachedCalendar(cacheKey, events);
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

  const filter = parsed.data.eventTypes;
  const filtered: CalendarEvent[] = filter && filter.length
    ? events.filter((e) => filter.includes(e.type))
    : events;

  return NextResponse.json({ events: filtered });
}
