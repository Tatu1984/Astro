// Shared chart types — single source of truth for both Next.js (TS) and the
// Python compute service (mirrored in app/schemas.py). Update both together.

export type HouseSystem =
  | "PLACIDUS"
  | "WHOLE_SIGN"
  | "KOCH"
  | "EQUAL"
  | "VEDIC_EQUAL";

export type AstroSystem = "WESTERN" | "VEDIC" | "BOTH";

export interface NatalRequest {
  birth_datetime_utc: string; // ISO 8601 in UTC
  latitude: number;
  longitude: number;
  house_system?: HouseSystem;
  system?: AstroSystem;
  unknown_time?: boolean;
}

export interface PlanetPosition {
  name: string;
  longitude_deg: number;
  latitude_deg: number;
  speed_deg_per_day: number;
  sign: string;
  house: number | null;
}

export interface NatalResponse {
  schema_version: string;
  computed_at: string;
  input_hash: string;
  house_system: HouseSystem;
  system: AstroSystem;
  planets: PlanetPosition[];
  houses: number[]; // 12 cusp longitudes
  ascendant_deg: number;
  midheaven_deg: number;
}

export interface TransitRequest {
  moment_utc: string; // ISO 8601
}

// Re-export type for autocomplete results — single shape across geocode util + UI.
export interface GeocodeResult {
  query: string;
  displayName: string;
  latitude: number;
  longitude: number;
  timezone: string;
  countryCode?: string;
}

export interface TransitResponse {
  schema_version: string;
  computed_at: string;
  moment_utc: string;
  planets: PlanetPosition[];
}

// =========================================================
// Vedic (sidereal) — mirror of Python compute schemas
// =========================================================

export interface VedicPlanetPosition {
  name: string;
  sidereal_long: number;
  sidereal_sign: string;
  sign_idx: number;
  house: number | null;
  nakshatra: string;
  nakshatra_idx: number;
  pada: number;
  nakshatra_lord: string;
  speed_deg_per_day: number;
  retrograde: boolean;
  navamsa_sign: string;        // D9 — marriage / dharma
  dasamsa_sign: string;        // D10 — career
  dvadasamsa_sign: string;     // D12 — parents
  shashtiamsa_sign: string;    // D60 — past karma
}

export interface DashaPeriod {
  lord: string;
  start: string; // ISO
  end: string;   // ISO
}

export interface DashaInfo {
  mahadasha: DashaPeriod;
  antardasha: DashaPeriod;
  upcoming_mahadashas: DashaPeriod[];
}

export interface VedicRequest {
  birth_datetime_utc: string;
  latitude: number;
  longitude: number;
}

export interface VedicResponse {
  schema_version: string;
  computed_at: string;
  ayanamsha_deg: number;
  ayanamsha_name: string;
  sidereal_ascendant: number;
  ascendant_sign: string;
  planets: VedicPlanetPosition[];
  dasha: DashaInfo;            // Vimshottari (120 yr)
  yogini_dasha: DashaInfo;     // Yogini (36 yr)
  is_manglik: boolean;
  manglik_reason: string;
}
