"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { Search } from "lucide-react";

import { Input } from "@/frontend/components/ui/shadcn/input";

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
  countryCode?: string;
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
  const [results, setResults] = useState<PickedPlace[]>([]);
  const [highlight, setHighlight] = useState(0);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const markerRef = useRef<L.Marker | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqIdRef = useRef(0);

  const center: [number, number] = value ? [value.latitude, value.longitude] : [28.6139, 77.209];

  // Debounced live search as the user types.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const myReqId = ++reqIdRef.current;
      setSearching(true);
      setError(null);
      try {
        const res = await fetch(`/api/geocode?multi=1&q=${encodeURIComponent(query)}`);
        if (myReqId !== reqIdRef.current) return; // a newer request superseded us
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          setError(body?.error ?? "search failed");
          setResults([]);
          return;
        }
        const data = (await res.json()) as { results: PickedPlace[] };
        setResults(data.results ?? []);
        setHighlight(0);
        setOpen(true);
      } finally {
        if (myReqId === reqIdRef.current) setSearching(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function selectResult(p: PickedPlace) {
    onChange(p);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectResult(results[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
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
          placeholder="Type a city, country, or full address — pick from suggestions"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => {
            // small delay so a click on a list item still fires
            setTimeout(() => setOpen(false), 150);
          }}
          autoComplete="off"
        />

        {open && (results.length > 0 || searching) ? (
          <ul
            role="listbox"
            className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-input bg-popover shadow-lg text-sm"
          >
            {searching && results.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted-foreground">Searching…</li>
            ) : null}
            {results.map((r, i) => (
              <li
                key={`${r.latitude},${r.longitude},${i}`}
                role="option"
                aria-selected={i === highlight}
                onMouseDown={(e) => e.preventDefault()} // keep input focused
                onClick={() => selectResult(r)}
                onMouseEnter={() => setHighlight(i)}
                className={
                  i === highlight
                    ? "px-3 py-2 cursor-pointer bg-accent text-accent-foreground"
                    : "px-3 py-2 cursor-pointer hover:bg-accent/50"
                }
              >
                <div className="truncate">{r.displayName}</div>
                <div className="text-[10px] text-muted-foreground">
                  {r.latitude.toFixed(3)}, {r.longitude.toFixed(3)} · {r.timezone}
                  {r.countryCode ? ` · ${r.countryCode}` : ""}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {error ? <p className="text-xs text-[var(--color-brand-rose)]">{error}</p> : null}

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
        <p className="text-xs text-muted-foreground">Start typing a place above; pick a suggestion. Drag the marker to fine-tune.</p>
      )}
    </div>
  );
}
