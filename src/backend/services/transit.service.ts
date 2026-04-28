import { env } from "@/config/env";
import type { NatalResponse, PlanetPosition, TransitRequest, TransitResponse } from "@/shared/types/chart";

class TransitError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "TransitError";
  }
}

async function callCompute<T>(path: string, body: unknown): Promise<T> {
  if (!env.COMPUTE_BASE_URL) throw new TransitError(500, "COMPUTE_BASE_URL not configured");
  if (!env.COMPUTE_SHARED_SECRET) throw new TransitError(500, "COMPUTE_SHARED_SECRET not configured");

  const url = `${env.COMPUTE_BASE_URL.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Compute-Secret": env.COMPUTE_SHARED_SECRET,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new TransitError(res.status, `compute ${path} failed: ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

export async function computeTransit(req: TransitRequest): Promise<TransitResponse> {
  return callCompute<TransitResponse>("/transit", req);
}

export interface TransitAspect {
  transit: string; // transit planet name
  aspect: "conjunction" | "sextile" | "square" | "trine" | "opposition";
  natal: string; // natal planet name
  natalSign: string;
  natalHouse: number | null;
  delta: number; // orb in degrees
  significance: number; // higher = more important to surface
  applying: boolean; // is the transit moving toward exact?
}

const ASPECTS = [
  { name: "conjunction", angle: 0, orb: 6 },
  { name: "sextile", angle: 60, orb: 4 },
  { name: "square", angle: 90, orb: 5 },
  { name: "trine", angle: 120, orb: 5 },
  { name: "opposition", angle: 180, orb: 6 },
] as const;

const SLOW_MOVERS = new Set(["Saturn", "Uranus", "Neptune", "Pluto"]);
const NATAL_KEY = new Set(["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "MeanNode"]);

function angleDiff(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360) + 360) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * Compute key transit-to-natal aspects. Higher significance for
 * slow-moving outer planets aspecting personal points (Sun/Moon/Asc/MC).
 */
export function computeTransitAspects(transit: TransitResponse, natal: NatalResponse): TransitAspect[] {
  const out: TransitAspect[] = [];
  for (const t of transit.planets) {
    if (!NATAL_KEY.has(t.name)) continue; // skip Mercury-as-transit-against-Mercury chatter
    for (const n of natal.planets) {
      if (!NATAL_KEY.has(n.name)) continue;
      const sep = angleDiff(t.longitude_deg, n.longitude_deg);
      for (const a of ASPECTS) {
        const delta = Math.abs(sep - a.angle);
        if (delta > a.orb) continue;

        // Significance: tight orb wins; outer-to-personal wins more.
        let sig = (a.orb - delta) * 2;
        if (n.name === "Sun" || n.name === "Moon") sig += 4;
        if (SLOW_MOVERS.has(t.name)) sig += 4;
        if (a.name === "conjunction" || a.name === "opposition") sig += 1;

        // Applying = transit longitude approaching exact aspect.
        // For a planet moving "forward" (positive speed), it's applying if
        // the natal target is currently slightly ahead in longitude.
        const exactLong = (n.longitude_deg + a.angle) % 360;
        const altLong = (n.longitude_deg - a.angle + 360) % 360;
        const distToExact = Math.min(angleDiff(t.longitude_deg, exactLong), angleDiff(t.longitude_deg, altLong));
        // Crude proxy: applying if the transit is still 0.05+ degrees from
        // exact and moving forward (most outers are functionally direct
        // most of the time on a daily basis).
        const applying = t.speed_deg_per_day >= 0 ? distToExact < a.orb : false;

        out.push({
          transit: t.name,
          aspect: a.name,
          natal: n.name,
          natalSign: n.sign,
          natalHouse: n.house,
          delta: Number(delta.toFixed(2)),
          significance: Number(sig.toFixed(2)),
          applying,
        });
      }
    }
  }
  return out.sort((a, b) => b.significance - a.significance);
}

export interface ResolveNowArgs {
  natal: NatalResponse;
  topN?: number;
}

export interface ResolveNowResult {
  moment: string;
  topAspects: TransitAspect[];
  transit: TransitResponse;
}

export async function resolveNowTransits(args: ResolveNowArgs): Promise<ResolveNowResult> {
  const moment = new Date().toISOString();
  const transit = await computeTransit({ moment_utc: moment });
  const aspects = computeTransitAspects(transit, args.natal);
  return { moment, topAspects: aspects.slice(0, args.topN ?? 6), transit };
}

export { TransitError };

// Helper for callers that want planet array without aspects.
export function transitPlanets(transit: TransitResponse): PlanetPosition[] {
  return transit.planets;
}
