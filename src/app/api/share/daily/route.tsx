import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/backend/database/client";
import { resolveNatal } from "@/backend/services/chart.service";
import { resolveHoroscope } from "@/backend/services/horoscope.service";

export const runtime = "nodejs"; // we hit Prisma + auth which are Node-only

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("unauthorized", { status: 401 });
  }

  const profileId = req.nextUrl.searchParams.get("profileId");
  const profile = profileId
    ? await prisma.profile.findUnique({
        where: { id: profileId },
        select: { id: true, userId: true, fullName: true, birthDate: true, latitude: true, longitude: true, timezone: true },
      })
    : await prisma.profile.findFirst({
        where: { userId: session.user.id, deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: { id: true, userId: true, fullName: true, birthDate: true, latitude: true, longitude: true, timezone: true },
      });
  if (!profile || profile.userId !== session.user.id) {
    return new Response("not found", { status: 404 });
  }

  // Pull cached natal + daily horoscope. Both are cheap once cached.
  let sunSign = "—";
  let moonSign = "—";
  let ascSign = "—";
  let headline = "Your reading awaits";
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
    sunSign = chart.planets.find((p) => p.name === "Sun")?.sign ?? "—";
    moonSign = chart.planets.find((p) => p.name === "Moon")?.sign ?? "—";
    ascSign = signFor(chart.ascendant_deg);

    const horo = await resolveHoroscope({
      userId: session.user.id,
      profileId: profile.id,
      kind: "DAILY",
    });
    headline = horo.payload.headline ?? headline;
  } catch {
    // ignore — render with whatever defaults we have
  }

  const todayLocal = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: profile.timezone,
  }).format(new Date());

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0e0a1f 0%, #1a1530 35%, #2a1a4a 70%, #0e0a1f 100%)",
          color: "#e9e3ff",
          fontFamily: "Geist, system-ui, sans-serif",
          padding: "64px",
          position: "relative",
        }}
      >
        {/* Star sparkles */}
        <Stars />

        {/* Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: "28px",
            fontWeight: 600,
            letterSpacing: "0.18em",
            color: "#f4c95d",
          }}
        >
          <SparkleIcon />
          ASTRO
        </div>

        {/* Hero */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "48px",
            flex: 1,
          }}
        >
          <div style={{ fontSize: "20px", color: "#998fc7", textTransform: "uppercase", letterSpacing: "0.15em" }}>
            {todayLocal}
          </div>
          <div
            style={{
              fontSize: "72px",
              fontWeight: 600,
              lineHeight: 1.05,
              marginTop: "16px",
              color: "#ffffff",
              maxWidth: "880px",
              display: "flex",
            }}
          >
            {truncate(headline, 80)}
          </div>
          <div
            style={{
              marginTop: "auto",
              display: "flex",
              gap: "32px",
              fontSize: "22px",
            }}
          >
            <Pill label="Sun" value={sunSign} accent="#f4c95d" />
            <Pill label="Moon" value={moonSign} accent="#3ad6c2" />
            <Pill label="Rising" value={ascSign} accent="#7c5cff" />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            color: "#998fc7",
            fontSize: "20px",
          }}
        >
          <span>{profile.fullName}</span>
          <span style={{ color: "#998fc7" }}>astro · daily reading</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}

function Pill({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "10px 22px",
        borderRadius: "999px",
        border: `1px solid ${accent}55`,
        background: `${accent}1a`,
      }}
    >
      <span style={{ fontSize: "13px", color: accent, textTransform: "uppercase", letterSpacing: "0.15em" }}>
        {label}
      </span>
      <span style={{ fontSize: "26px", color: "#ffffff", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function SparkleIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 6.5L20 11l-6.5 1.5L12 19l-1.5-6.5L4 11l6.5-1.5z" />
    </svg>
  );
}

function Stars() {
  // Decorative scatter — fixed positions chosen for balanced layout
  const positions = [
    [120, 100, 4], [200, 200, 2], [300, 80, 3],
    [900, 130, 3], [1050, 220, 4], [1100, 340, 2],
    [800, 480, 2], [950, 540, 3], [180, 480, 2],
    [60, 360, 3], [1140, 80, 2], [600, 60, 2],
  ];
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex" }}>
      {positions.map(([x, y, r], i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${x}px`,
            top: `${y}px`,
            width: `${r}px`,
            height: `${r}px`,
            borderRadius: "50%",
            background: "#e9e3ff",
            opacity: 0.55,
          }}
        />
      ))}
    </div>
  );
}

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer",
  "Leo", "Virgo", "Libra", "Scorpio",
  "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];
function signFor(longitude: number): string {
  return SIGNS[Math.floor((((longitude % 360) + 360) % 360) / 30)];
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}
