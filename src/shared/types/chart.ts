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

export interface TransitResponse {
  schema_version: string;
  computed_at: string;
  moment_utc: string;
  planets: PlanetPosition[];
}
