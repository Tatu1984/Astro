/**
 * Composite + Davison "relationship charts" — two ways of viewing the
 * partnership as its own entity.
 *
 * Composite: each planet's longitude = midpoint of the two natal
 * longitudes (along the shorter arc). Pure midpoint math, no ephemeris.
 *
 * Davison: a real natal chart computed for the midpoint date + midpoint
 * place of the two birth events. Needs an extra /natal call to the
 * Python compute service.
 */

import { resolveNatal } from "@/backend/services/chart.service";
import type { NatalResponse, PlanetPosition } from "@/shared/types/chart";

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer",
  "Leo", "Virgo", "Libra", "Scorpio",
  "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

function signFor(longitudeDeg: number): string {
  return SIGNS[Math.floor((((longitudeDeg % 360) + 360) % 360) / 30)];
}

/** Midpoint of two angles along the shorter arc. */
export function midpointAngle(a: number, b: number): number {
  const diff = ((b - a + 540) % 360) - 180; // signed shortest delta from a -> b
  return ((a + diff / 2) % 360 + 360) % 360;
}

/** Midpoint of two longitudes on a sphere (handles wrap at ±180°). */
function midpointLongitude(a: number, b: number): number {
  const diff = ((b - a + 540) % 360) - 180;
  return ((a + diff / 2 + 540) % 360) - 180;
}

export interface CompositePlanet {
  name: string;
  longitude_deg: number;
  sign: string;
}

export interface CompositeChart {
  ascendant_deg: number;
  midheaven_deg: number;
  ascendant_sign: string;
  midheaven_sign: string;
  planets: CompositePlanet[];
}

/**
 * Pure midpoint composite. Asc / MC / each planet is the midpoint along
 * the shorter arc.
 */
export function computeComposite(a: NatalResponse, b: NatalResponse): CompositeChart {
  const planets: CompositePlanet[] = [];
  const planetMap = new Map<string, PlanetPosition>();
  for (const p of a.planets) planetMap.set(p.name, p);

  for (const pa of a.planets) {
    const pb = b.planets.find((p) => p.name === pa.name);
    if (!pb) continue;
    const mid = midpointAngle(pa.longitude_deg, pb.longitude_deg);
    planets.push({ name: pa.name, longitude_deg: mid, sign: signFor(mid) });
  }

  const asc = midpointAngle(a.ascendant_deg, b.ascendant_deg);
  const mc = midpointAngle(a.midheaven_deg, b.midheaven_deg);

  return {
    ascendant_deg: asc,
    midheaven_deg: mc,
    ascendant_sign: signFor(asc),
    midheaven_sign: signFor(mc),
    planets,
  };
}

interface ProfileBirthInput {
  id: string;
  birthDate: Date;
  latitude: number;
  longitude: number;
}

interface DavisonInputs {
  userId: string;
  // The composite chart can use either profile to attribute the cached
  // chart row in Postgres — pick A. Davison is a synthetic chart so its
  // Chart row will be reused if the same pair is computed twice.
  profileA: ProfileBirthInput;
  profileB: ProfileBirthInput;
}

/**
 * Davison "relationship chart" — a real natal chart for the midpoint
 * birth moment + midpoint location.
 */
export async function computeDavison(args: DavisonInputs): Promise<NatalResponse> {
  const ms = (args.profileA.birthDate.getTime() + args.profileB.birthDate.getTime()) / 2;
  const midDate = new Date(ms);
  const midLat = (args.profileA.latitude + args.profileB.latitude) / 2;
  const midLon = midpointLongitude(args.profileA.longitude, args.profileB.longitude);

  const result = await resolveNatal({
    userId: args.userId,
    profileId: args.profileA.id, // attribute to A; the compute is keyed by inputHash
    request: {
      birth_datetime_utc: midDate.toISOString(),
      latitude: midLat,
      longitude: midLon,
      house_system: "PLACIDUS",
      system: "BOTH",
    },
  });
  return result.chart;
}
