"use client";

import dynamic from "next/dynamic";

import type { PickedPlace } from "./MapPickerInner";

// Leaflet hits `window` at import time, so SSR is disabled here. The inner
// file owns all browser-only code (CSS import, L.Icon defaults, refs).
const MapPickerInner = dynamic(() => import("./MapPickerInner"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full animate-pulse rounded-md border border-input bg-muted/30" />
  ),
});

export type { PickedPlace };

export function MapPicker(props: {
  value: PickedPlace | null;
  onChange: (p: PickedPlace) => void;
}) {
  return <MapPickerInner {...props} />;
}
