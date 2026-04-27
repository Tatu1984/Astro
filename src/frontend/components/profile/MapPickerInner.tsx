"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { Search } from "lucide-react";

import { Input } from "@/frontend/components/ui/shadcn/input";

// Default Leaflet icons reference image paths that turbopack can't resolve.
// Use public CDN URLs so the marker actually renders.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export interface PickedPlace {
  displayName: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 10, { duration: 0.6 });
  }, [lat, lng, map]);
  return null;
}

interface MapPickerInnerProps {
  value: PickedPlace | null;
  onChange: (p: PickedPlace) => void;
}

export default function MapPickerInner({ value, onChange }: MapPickerInnerProps) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Default centre: Delhi if nothing chosen yet
  const center: [number, number] = value ? [value.latitude, value.longitude] : [28.6139, 77.209];

  async function runSearch(q: string) {
    setError(null);
    if (!q.trim()) return;
    setSearching(true);
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
    setSearching(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "search failed");
      return;
    }
    const data = (await res.json()) as PickedPlace;
    onChange(data);
  }

  async function onMarkerDragEnd() {
    const m = markerRef.current;
    if (!m) return;
    const { lat, lng } = m.getLatLng();
    setError(null);
    const res = await fetch(`/api/tz?lat=${lat}&lng=${lng}`);
    if (!res.ok) return;
    const tz = (await res.json()) as { timezone: string };
    onChange({
      displayName: value?.displayName ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      latitude: lat,
      longitude: lng,
      timezone: tz.timezone,
    });
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-8"
          placeholder="Search city or place — Enter to search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void runSearch(query);
            }
          }}
        />
      </div>
      {error ? <p className="text-xs text-[var(--color-brand-rose)]">{error}</p> : null}
      {searching ? <p className="text-xs text-muted-foreground">Searching…</p> : null}

      <div className="h-64 w-full overflow-hidden rounded-md border border-input">
        <MapContainer center={center} zoom={value ? 10 : 4} className="h-full w-full" scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {value ? (
            <>
              <Marker
                position={[value.latitude, value.longitude]}
                draggable
                ref={(ref) => {
                  markerRef.current = ref ?? null;
                }}
                eventHandlers={{ dragend: onMarkerDragEnd }}
              />
              <FlyTo lat={value.latitude} lng={value.longitude} />
            </>
          ) : null}
        </MapContainer>
      </div>

      {value ? (
        <p className="text-xs text-muted-foreground">
          {value.displayName} · {value.latitude.toFixed(4)}, {value.longitude.toFixed(4)} · {value.timezone}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Search for a place above. The marker is draggable for fine-tuning.</p>
      )}
    </div>
  );
}
