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

export interface UpcomingAspect {
  transit: string;
  aspect: TransitAspect["aspect"];
  natal: string;
  natalSign: string;
  natalHouse: number | null;
  daysFromNow: number;
  peakDate: string; // ISO
  currentOrb: number;
}

const ASPECT_ANGLES: ReadonlyArray<{ name: TransitAspect["aspect"]; angle: number; orb: number }> = [
  { name: "conjunction", angle: 0, orb: 8 },
  { name: "sextile", angle: 60, orb: 6 },
  { name: "square", angle: 90, orb: 7 },
  { name: "trine", angle: 120, orb: 7 },
  { name: "opposition", angle: 180, orb: 8 },
];

/**
 * Given the current transit positions and a natal chart, predict which
 * aspects will go exact within `daysAhead` days. Uses current speed as a
 * linear proxy — accurate for a few weeks, imprecise across retrograde
 * stations (the next pass after a station is missed).
 */
export function predictUpcomingAspects(
  transit: TransitResponse,
  natal: NatalResponse,
  daysAhead = 60,
): UpcomingAspect[] {
  const out: UpcomingAspect[] = [];
  const now = new Date(transit.moment_utc).getTime();

  for (const t of transit.planets) {
    if (!NATAL_KEY.has(t.name)) continue;
    if (Math.abs(t.speed_deg_per_day) < 0.001) continue; // stationary; skip

    for (const n of natal.planets) {
      if (!NATAL_KEY.has(n.name)) continue;

      // Build a set of target longitudes per aspect (each aspect has two targets)
      for (const a of ASPECT_ANGLES) {
        const targets = [
          (n.longitude_deg + a.angle) % 360,
          (n.longitude_deg - a.angle + 360) % 360,
        ];
        for (const target of targets) {
          // Direct distance from transit to target along its motion direction.
          // Positive direction = forward along the zodiac.
          const dirSpeed = t.speed_deg_per_day;
          const sign = dirSpeed >= 0 ? 1 : -1;

          // signed delta in [-180, 180] from transit toward target
          const raw = ((target - t.longitude_deg + 540) % 360) - 180;
          const movementToTarget = sign === 1 ? (raw < 0 ? raw + 360 : raw) : raw < 0 ? -raw : 360 - raw;
          const days = movementToTarget / Math.abs(dirSpeed);

          // Currently within orb? Then it's already "active" — daysFromNow = 0
          // and peakDate is also "now" (very rough).
          const currentSep = (() => {
            const d = Math.abs(((t.longitude_deg - n.longitude_deg) % 360) + 360) % 360;
            return d > 180 ? 360 - d : d;
          })();
          const inOrbNow = Math.abs(currentSep - a.angle) <= a.orb;

          if (days >= 0 && days <= daysAhead) {
            out.push({
              transit: t.name,
              aspect: a.name,
              natal: n.name,
              natalSign: n.sign,
              natalHouse: n.house,
              daysFromNow: Number(days.toFixed(1)),
              peakDate: new Date(now + days * 24 * 60 * 60 * 1000).toISOString(),
              currentOrb: Number((inOrbNow ? Math.abs(currentSep - a.angle) : days * Math.abs(dirSpeed)).toFixed(2)),
            });
          }
        }
      }
    }
  }

  // Dedupe (same triple may come from both targets of the aspect — keep nearest)
  const byKey = new Map<string, UpcomingAspect>();
  for (const a of out) {
    const key = `${a.transit}|${a.aspect}|${a.natal}`;
    const prev = byKey.get(key);
    if (!prev || a.daysFromNow < prev.daysFromNow) byKey.set(key, a);
  }

  // Significance prioritisation: outer transits to luminaries first.
  return Array.from(byKey.values()).sort((a, b) => a.daysFromNow - b.daysFromNow);
}

export interface UpcomingCalendar {
  generatedAt: string;
  daysAhead: number;
  events: UpcomingAspect[];
}

export async function buildCalendar(args: { natal: NatalResponse; daysAhead?: number }): Promise<UpcomingCalendar> {
  const daysAhead = args.daysAhead ?? 60;
  const transit = await computeTransit({ moment_utc: new Date().toISOString() });
  const events = predictUpcomingAspects(transit, args.natal, daysAhead);
  return { generatedAt: new Date().toISOString(), daysAhead, events };
}

export interface RetrogradeWindow {
  planet: string;
  startDate: string; // ISO
  endDate: string; // ISO
  status: "active" | "upcoming" | "ended";
}

const RETRO_CANDIDATES = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];

/**
 * Sample compute /transit at daily intervals over a window and detect
 * retrograde periods (negative speed). Returns one window per planet
 * per direction-change pair.
 *
 * Cost: ~daysAhead+pastDays calls in parallel (Promise.all), warm Render
 * handles ~100 in <2s. Free tier OK for the 90-day windows we use.
 */
export async function findRetrogradeWindows(args: {
  daysAhead?: number;
  daysPast?: number;
  /** Sample every Nth day. Default 3 — Mercury retrogrades are 3 weeks so 3-day resolution is plenty. */
  stepDays?: number;
}): Promise<RetrogradeWindow[]> {
  const daysAhead = args.daysAhead ?? 90;
  const daysPast = args.daysPast ?? 30;
  const step = args.stepDays ?? 3;

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const samples: number[] = [];
  for (let d = -daysPast; d <= daysAhead; d += step) samples.push(now + d * dayMs);

  const responses = await Promise.all(
    samples.map((t) => computeTransit({ moment_utc: new Date(t).toISOString() })),
  );

  // For each candidate planet, walk the timeline looking for retrograde
  // (speed < 0) spans. Record start/end and classify by today's position.
  const windows: RetrogradeWindow[] = [];
  for (const planet of RETRO_CANDIDATES) {
    let inSpan = false;
    let spanStartIdx = 0;
    for (let i = 0; i < responses.length; i++) {
      const p = responses[i].planets.find((q) => q.name === planet);
      if (!p) continue;
      const isRetro = p.speed_deg_per_day < 0;
      if (isRetro && !inSpan) {
        inSpan = true;
        spanStartIdx = i;
      } else if (!isRetro && inSpan) {
        inSpan = false;
        const start = new Date(samples[spanStartIdx]).toISOString();
        const end = new Date(samples[i - 1]).toISOString();
        windows.push({
          planet,
          startDate: start,
          endDate: end,
          status: classifyWindow(samples[spanStartIdx], samples[i - 1], now),
        });
      }
    }
    if (inSpan) {
      // span runs past the end of our window
      const start = new Date(samples[spanStartIdx]).toISOString();
      const end = new Date(samples[samples.length - 1]).toISOString();
      windows.push({
        planet,
        startDate: start,
        endDate: end,
        status: classifyWindow(samples[spanStartIdx], samples[samples.length - 1], now),
      });
    }
  }

  return windows.sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate));
}

function classifyWindow(start: number, end: number, now: number): RetrogradeWindow["status"] {
  if (now < start) return "upcoming";
  if (now > end) return "ended";
  return "active";
}

// ============================================================
// Muhurta finder — auspicious days based on day-of-week + Moon
// nakshatra + tithi. Pure ephemeris scan; no LLM cost.
// ============================================================

const NAKSHATRAS_27 = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
  "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni",
  "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha",
  "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana",
  "Dhanishta", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada",
  "Revati",
];

// Each nakshatra's traditional muhurta-friendliness 0..4. Sources vary;
// using BPHS-leaning consensus.
const NAK_AUSPICE: Record<number, number> = {
   0: 4, // Ashwini       — universally good
   1: 1, // Bharani       — generally avoided
   2: 1, // Krittika      — fierce
   3: 4, // Rohini        — most auspicious
   4: 3, // Mrigashira
   5: 1, // Ardra         — sharp
   6: 3, // Punarvasu
   7: 4, // Pushya        — universally auspicious
   8: 0, // Ashlesha      — sharp
   9: 0, // Magha         — pitru
  10: 1, // Purva Phalguni
  11: 3, // Uttara Phalguni
  12: 4, // Hasta
  13: 4, // Chitra
  14: 3, // Swati
  15: 1, // Vishakha
  16: 4, // Anuradha
  17: 1, // Jyeshtha
  18: 0, // Mula
  19: 1, // Purva Ashadha
  20: 4, // Uttara Ashadha
  21: 4, // Shravana
  22: 2, // Dhanishta
  23: 1, // Shatabhisha
  24: 1, // Purva Bhadrapada
  25: 3, // Uttara Bhadrapada
  26: 4, // Revati
};

// Days of the week 0=Sunday..6=Saturday with their lord and base score.
const WEEKDAY_INFO: Array<{ name: string; lord: string; score: number }> = [
  { name: "Sunday",    lord: "Sun",     score: 2 },
  { name: "Monday",    lord: "Moon",    score: 4 },
  { name: "Tuesday",   lord: "Mars",    score: 1 },
  { name: "Wednesday", lord: "Mercury", score: 3 },
  { name: "Thursday",  lord: "Jupiter", score: 4 },
  { name: "Friday",    lord: "Venus",   score: 4 },
  { name: "Saturday",  lord: "Saturn",  score: 1 },
];

// Tithi 1..30. 1-15 are Shukla Paksha (waxing); 16-30 are Krishna Paksha
// (waning). Position-based scoring (Nanda/Bhadra/Jaya/Rikta/Purna).
function tithiScore(tithi: number): { score: number; name: string } {
  // Position in the half-cycle (1..15)
  const pos = ((tithi - 1) % 15) + 1;
  const map: Record<number, [number, string]> = {
    1:  [3, "Pratipada / Nanda"],
    2:  [3, "Dwitiya / Bhadra"],
    3:  [4, "Tritiya / Jaya"],
    4:  [0, "Chaturthi / Rikta"],
    5:  [3, "Panchami / Purna"],
    6:  [3, "Shashti / Nanda"],
    7:  [3, "Saptami / Bhadra"],
    8:  [4, "Ashtami / Jaya"],
    9:  [0, "Navami / Rikta"],
    10: [3, "Dashami / Purna"],
    11: [3, "Ekadashi / Nanda"],
    12: [3, "Dwadashi / Bhadra"],
    13: [4, "Trayodashi / Jaya"],
    14: [0, "Chaturdashi / Rikta"],
    15: [tithi === 15 ? 4 : 0, tithi === 15 ? "Purnima" : "Amavasya"],
  };
  const [score, name] = map[pos] ?? [2, ""];
  return { score, name: name + (tithi > 15 ? " (Krishna)" : tithi <= 15 && tithi !== 15 ? " (Shukla)" : "") };
}

// Lahiri ayanamsha is ~24.58° in 2026 era. For muhurta's day-level
// resolution this constant is well within tolerance.
const LAHIRI_AYANAMSHA_2026 = 24.58;

export interface MuhurtaDay {
  date: string;           // ISO local-day
  weekday: string;
  weekdayLord: string;
  nakshatra: string;
  nakshatraIdx: number;
  tithi: number;          // 1..30
  tithiName: string;
  score: number;          // 0..100
  rating: "auspicious" | "favourable" | "neutral" | "avoid" | "very-avoid";
}

function muhurtaRating(score: number): MuhurtaDay["rating"] {
  if (score >= 80) return "auspicious";
  if (score >= 65) return "favourable";
  if (score >= 45) return "neutral";
  if (score >= 25) return "avoid";
  return "very-avoid";
}

export async function findMuhurta(args: {
  daysAhead?: number;
}): Promise<MuhurtaDay[]> {
  const daysAhead = args.daysAhead ?? 30;
  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const samples: number[] = [];
  // Sample around noon UTC to be near the middle of any given day.
  for (let d = 0; d < daysAhead; d++) {
    const base = new Date(now + d * dayMs);
    base.setUTCHours(12, 0, 0, 0);
    samples.push(base.getTime());
  }

  const responses = await Promise.all(
    samples.map((t) => computeTransit({ moment_utc: new Date(t).toISOString() })),
  );

  const out: MuhurtaDay[] = [];
  for (let i = 0; i < responses.length; i++) {
    const r = responses[i];
    const sun = r.planets.find((p) => p.name === "Sun");
    const moon = r.planets.find((p) => p.name === "Moon");
    if (!sun || !moon) continue;

    const moonSidereal = ((moon.longitude_deg - LAHIRI_AYANAMSHA_2026) % 360 + 360) % 360;
    const nakIdx = Math.floor(moonSidereal / (360 / 27));
    const nakName = NAKSHATRAS_27[nakIdx];

    // Tithi: angular distance Moon - Sun in the tropical zodiac (works
    // identically in sidereal since both shift by the same ayanamsha).
    const angularDelta = ((moon.longitude_deg - sun.longitude_deg + 360) % 360);
    const tithi = Math.floor(angularDelta / 12) + 1; // 1..30
    const { score: tScore, name: tithiName } = tithiScore(tithi);

    const dt = new Date(samples[i]);
    const weekday = dt.getUTCDay();
    const wd = WEEKDAY_INFO[weekday];

    // Composite score 0..100. Weights: nakshatra 50%, tithi 30%,
    // weekday 20%.
    const nakNorm = (NAK_AUSPICE[nakIdx] ?? 2) * 25; // 0..100
    const tithiNorm = tScore * 25;                    // 0..100
    const wdNorm = wd.score * 25;                     // 0..100
    const score = Math.round(0.5 * nakNorm + 0.3 * tithiNorm + 0.2 * wdNorm);

    out.push({
      date: dt.toISOString(),
      weekday: wd.name,
      weekdayLord: wd.lord,
      nakshatra: nakName,
      nakshatraIdx: nakIdx,
      tithi,
      tithiName,
      score,
      rating: muhurtaRating(score),
    });
  }

  return out;
}

export type EclipseKind = "solar" | "lunar";

export interface EclipseEvent {
  kind: EclipseKind;
  date: string; // ISO — date of the new/full moon
  moonSign: string;
  sunSign: string;
  nodalDistance: number; // Moon's distance from nearest Node, in degrees
  status: "active" | "upcoming" | "ended";
}

const NODE_ECLIPSE_LIMIT_DEG = 12; // tighter limit for clear-cut eclipses

/**
 * Scan daily samples for Sun-Moon syzygies (new/full moons). Flag those
 * within ~12° of the lunar nodes as eclipses.
 *
 * Resolution: 1-day. Eclipse dates land on the right day; not exact to
 * the minute. Free-tier-friendly: ~90 calls in parallel for a 90-day
 * window, ~3-5s warm.
 */
export async function findEclipses(args: {
  daysPast?: number;
  daysAhead?: number;
}): Promise<EclipseEvent[]> {
  const daysAhead = args.daysAhead ?? 90;
  const daysPast = args.daysPast ?? 14;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const samples: number[] = [];
  for (let d = -daysPast; d <= daysAhead; d++) samples.push(now + d * dayMs);

  const responses = await Promise.all(
    samples.map((t) => computeTransit({ moment_utc: new Date(t).toISOString() })),
  );

  const series = responses.map((r) => {
    const sun = r.planets.find((p) => p.name === "Sun");
    const moon = r.planets.find((p) => p.name === "Moon");
    const node = r.planets.find((p) => p.name === "MeanNode");
    return {
      moment: r.moment_utc,
      sunLong: sun?.longitude_deg ?? 0,
      moonLong: moon?.longitude_deg ?? 0,
      nodeLong: node?.longitude_deg ?? 0,
      moonSign: moon?.sign ?? "?",
      sunSign: sun?.sign ?? "?",
    };
  });

  function angleDelta(a: number, b: number): number {
    const d = Math.abs(((a - b) % 360) + 360) % 360;
    return d > 180 ? 360 - d : d;
  }

  const events: EclipseEvent[] = [];
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1];
    const curr = series[i];

    // Sun-Moon angular separation, signed in [-180, 180]
    const sepPrev = ((prev.moonLong - prev.sunLong + 540) % 360) - 180;
    const sepCurr = ((curr.moonLong - curr.sunLong + 540) % 360) - 180;

    // Crossing 0 (new moon) or ±180 (full moon)?
    const crossedNewMoon = Math.sign(sepPrev) !== Math.sign(sepCurr) && Math.abs(sepPrev) < 30 && Math.abs(sepCurr) < 30;
    const crossedFullMoon =
      Math.abs(sepPrev) > 150 && Math.abs(sepCurr) > 150 && Math.sign(sepPrev) !== Math.sign(sepCurr);

    if (!crossedNewMoon && !crossedFullMoon) continue;

    // Pick whichever sample has the smaller |sep| (or |sep|−180) — that's
    // closer to exact syzygy. Use that sample's date.
    const targetIsFull = crossedFullMoon;
    const distToTarget = (s: number) => (targetIsFull ? Math.abs(180 - Math.abs(s)) : Math.abs(s));
    const closer = distToTarget(sepCurr) < distToTarget(sepPrev) ? curr : prev;

    const moonNodeDist = Math.min(
      angleDelta(closer.moonLong, closer.nodeLong),
      angleDelta(closer.moonLong, (closer.nodeLong + 180) % 360),
    );
    if (moonNodeDist > NODE_ECLIPSE_LIMIT_DEG) continue;

    events.push({
      kind: targetIsFull ? "lunar" : "solar",
      date: closer.moment,
      moonSign: closer.moonSign,
      sunSign: closer.sunSign,
      nodalDistance: Number(moonNodeDist.toFixed(2)),
      status: classifyWindow(Date.parse(closer.moment), Date.parse(closer.moment) + dayMs, now),
    });
  }

  return events;
}
