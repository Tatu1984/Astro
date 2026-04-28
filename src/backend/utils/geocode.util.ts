// Server-side geocoder using OpenStreetMap Nominatim. No API key, no signup.
// Fair-use policy: ~1 req/sec, must set a User-Agent.
// https://operations.osmfoundation.org/policies/nominatim/
// tz-lookup is large (~70KB) — keep it server-side only.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tzLookup: (lat: number, lng: number) => string = require("tz-lookup");

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "AstroApp/0.1 (https://github.com/Tatu1984/Astro)";

export interface GeocodeResult {
  query: string;
  displayName: string;
  latitude: number;
  longitude: number;
  timezone: string;
  countryCode?: string;
}

export function tzAt(latitude: number, longitude: number): string {
  return tzLookup(latitude, longitude);
}

class GeocodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeocodeError";
  }
}

export async function geocode(query: string): Promise<GeocodeResult> {
  const trimmed = query.trim();
  if (!trimmed) throw new GeocodeError("empty geocode query");

  const url = new URL(NOMINATIM_BASE);
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
    cache: "force-cache",
  });

  if (!res.ok) {
    throw new GeocodeError(`nominatim ${res.status}: ${await res.text().catch(() => res.statusText)}`);
  }

  const rows = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
    address?: { country_code?: string };
  }>;

  if (!rows.length) throw new GeocodeError(`no results for "${trimmed}"`);

  const row = rows[0];
  const latitude = Number(row.lat);
  const longitude = Number(row.lon);
  return {
    query: trimmed,
    displayName: row.display_name,
    latitude,
    longitude,
    timezone: tzLookup(latitude, longitude),
    countryCode: row.address?.country_code?.toUpperCase(),
  };
}

/**
 * Autocomplete-friendly search — returns up to N matching places with
 * lat/lng/timezone for each, so the UI can show a dropdown of options.
 */
export async function searchPlaces(query: string, limit = 5): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url = new URL(NOMINATIM_BASE);
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(Math.max(1, Math.min(10, limit))));
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    cache: "force-cache",
  });
  if (!res.ok) {
    throw new GeocodeError(`nominatim ${res.status}: ${await res.text().catch(() => res.statusText)}`);
  }

  const rows = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
    address?: { country_code?: string };
  }>;

  return rows.map((row) => {
    const latitude = Number(row.lat);
    const longitude = Number(row.lon);
    return {
      query: trimmed,
      displayName: row.display_name,
      latitude,
      longitude,
      timezone: tzLookup(latitude, longitude),
      countryCode: row.address?.country_code?.toUpperCase(),
    };
  });
}

export { GeocodeError };
