export type BirthDataTier = "HIGH" | "MEDIUM" | "LOW";

export interface BirthDataQuality {
  tier: BirthDataTier;
  caveats: string[];
}

export interface BirthDataInput {
  /** Marker that the user couldn't supply a birth time. */
  unknownTime?: boolean | null;
  /** Numeric ISO8601 date or Date — fuzzy/missing inputs are LOW. */
  birthDate?: Date | string | null;
  /** Lat in decimal degrees. Treat exact 0 as missing unless paired with lng != 0. */
  latitude?: number | null;
  /** Lng in decimal degrees. */
  longitude?: number | null;
  /** Free-text place name; missing → LOW even if coords look set. */
  birthPlace?: string | null;
  /** IANA tz id, e.g. "Asia/Kolkata". Missing or "UTC" fallback drops tier. */
  timezone?: string | null;
}

const TIME_CAVEAT =
  "Birth time is unknown — Moon sign is approximate, ascendant and house placements are unreliable, so predictions tied to those will be less specific.";
const PLACE_CAVEAT =
  "Birth place coordinates are missing or fuzzy — house cusps and local-time anchors may be off; treat the reading as broad, not precise.";
const DATE_CAVEAT =
  "Birth date is missing or unclear — nearly every chart calculation depends on it, so the reading should be taken as illustrative only.";
const TZ_CAVEAT =
  "No specific timezone on file — readings assume UTC for the given date, which can shift planet placements by up to a sign.";

function isPlausibleDate(d: Date | string | null | undefined): boolean {
  if (!d) return false;
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return false;
  const year = date.getUTCFullYear();
  return year >= 1700 && year <= 2200;
}

function hasRealCoords(lat?: number | null, lng?: number | null): boolean {
  if (lat == null || lng == null) return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  // Exactly 0,0 is "Null Island" — a placeholder, not a real birthplace.
  if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) return false;
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

/**
 * Score a profile's birth-data inputs into HIGH/MEDIUM/LOW.
 *  HIGH   — date, time, place, coords, timezone all good.
 *  MEDIUM — time unknown but date + place + coords good.
 *  LOW    — any of date/place/coords are missing, fuzzy, or implausible.
 */
export function scoreBirthData(input: BirthDataInput): BirthDataQuality {
  const caveats: string[] = [];
  const goodDate = isPlausibleDate(input.birthDate ?? null);
  const goodCoords = hasRealCoords(input.latitude, input.longitude);
  const goodPlace = Boolean(input.birthPlace && input.birthPlace.trim().length >= 2);
  const goodTz = Boolean(input.timezone && input.timezone.trim().length >= 2);
  const timeKnown = !input.unknownTime;

  if (!goodDate) caveats.push(DATE_CAVEAT);
  if (!goodCoords || !goodPlace) caveats.push(PLACE_CAVEAT);
  if (!goodTz) caveats.push(TZ_CAVEAT);
  if (!timeKnown) caveats.push(TIME_CAVEAT);

  let tier: BirthDataTier;
  if (!goodDate || (!goodCoords && !goodPlace)) {
    tier = "LOW";
  } else if (!timeKnown) {
    tier = "MEDIUM";
  } else {
    tier = "HIGH";
  }
  return { tier, caveats };
}

/**
 * Format the caveats as a system-prompt block. Returns "" for HIGH tier
 * so prompts stay clean for high-quality data.
 */
export function caveatsForPrompt(quality: BirthDataQuality): string {
  if (quality.tier === "HIGH" || quality.caveats.length === 0) return "";
  return [
    "Birth-data quality notes (be transparent with the reader where relevant):",
    ...quality.caveats.map((c) => `- ${c}`),
  ].join("\n");
}
