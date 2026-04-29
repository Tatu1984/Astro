"use client";

import { useEffect, useMemo, useState } from "react";

import { Card } from "@/frontend/components/ui/Card";

export type CalendarEvent = {
  type: "INGRESS" | "RETRO_STATION" | "ASPECT_EXACT";
  date: string;
  planet: string;
  fromSign?: string;
  toSign?: string;
  station?: "retrograde" | "direct";
  aspect?: "conjunction" | "sextile" | "square" | "trine" | "opposition";
  natal?: string;
  natalSign?: string;
  natalHouse?: number | null;
  severity: 1 | 2 | 3;
};

type Props = {
  profileId: string;
  initialFromIso: string;
  initialToIso: string;
};

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; events: CalendarEvent[] }
  | { status: "error"; error: string };

const SEVERITY_COLOR: Record<1 | 2 | 3, string> = {
  1: "var(--color-brand-aqua)",
  2: "var(--color-brand-gold)",
  3: "var(--color-brand-rose)",
};

function ymKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function dayIso(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month, day, 12, 0, 0)).toISOString();
}

function eventsByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const d = new Date(e.date);
    const k = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
    const arr = map.get(k) ?? [];
    arr.push(e);
    map.set(k, arr);
  }
  return map;
}

function describeEvent(e: CalendarEvent): string {
  if (e.type === "INGRESS") return `${e.planet} enters ${e.toSign} (from ${e.fromSign})`;
  if (e.type === "RETRO_STATION") return `${e.planet} stations ${e.station}`;
  return `${e.planet} ${e.aspect} natal ${e.natal} (${e.natalSign}${e.natalHouse ? ` · h${e.natalHouse}` : ""})`;
}

export function MonthGrid({ profileId, initialFromIso, initialToIso }: Props) {
  const [fromIso, setFromIso] = useState(initialFromIso);
  const [toIso, setToIso] = useState(initialToIso);
  const [state, setState] = useState<FetchState>({ status: "idle" });
  const [selected, setSelected] = useState<{ key: string; events: CalendarEvent[] } | null>(null);

  const cursorMonth = useMemo(() => new Date(fromIso), [fromIso]);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    void fetch("/api/transits/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, fromDate: fromIso, toDate: toIso }),
    })
      .then(async (res) => {
        const json = (await res.json()) as { events?: CalendarEvent[]; error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setState({ status: "error", error: json.error ?? `HTTP ${res.status}` });
          return;
        }
        setState({ status: "ready", events: json.events ?? [] });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({ status: "error", error: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [profileId, fromIso, toIso]);

  const eventsMap = useMemo(
    () => (state.status === "ready" ? eventsByDay(state.events) : new Map<string, CalendarEvent[]>()),
    [state],
  );

  const daysInMonth = useMemo(() => {
    const y = cursorMonth.getUTCFullYear();
    const m = cursorMonth.getUTCMonth();
    const first = new Date(Date.UTC(y, m, 1));
    const last = new Date(Date.UTC(y, m + 1, 0));
    const startDow = first.getUTCDay();
    const total = last.getUTCDate();
    const cells: Array<{ day: number; date: Date } | null> = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push({ day: d, date: new Date(Date.UTC(y, m, d)) });
    return cells;
  }, [cursorMonth]);

  const monthLabel = cursorMonth.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  function shiftMonth(delta: number) {
    const cur = new Date(fromIso);
    const y = cur.getUTCFullYear();
    const m = cur.getUTCMonth();
    const newFrom = dayIso(y, m + delta, 1);
    const newToD = new Date(Date.UTC(y, m + delta + 1, 0));
    const newTo = newToD.toISOString();
    setFromIso(newFrom);
    setToIso(newTo);
    setSelected(null);
  }

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-5">
      <Card className="!p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">{monthLabel}</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="px-3 py-1 text-xs rounded border border-white/10 text-white/70 hover:text-white hover:bg-white/5"
            >
              ← Prev
            </button>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="px-3 py-1 text-xs rounded border border-white/10 text-white/70 hover:text-white hover:bg-white/5"
            >
              Next →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-[10px] text-white/40 uppercase tracking-wider mb-1.5">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-center">
              {d}
            </div>
          ))}
        </div>

        {state.status === "loading" ? (
          <p className="text-xs text-white/45 py-6 text-center">Computing transit calendar…</p>
        ) : state.status === "error" ? (
          <p className="text-xs text-[var(--color-brand-rose)] py-6 text-center">{state.error}</p>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {daysInMonth.map((cell, i) => {
              if (!cell) return <div key={i} className="h-16" />;
              const k = `${cell.date.getUTCFullYear()}-${cell.date.getUTCMonth() + 1}-${cell.day}`;
              const evs = eventsMap.get(k) ?? [];
              const isSelected = selected?.key === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSelected({ key: k, events: evs })}
                  className={
                    "h-16 rounded-md border px-1.5 py-1 text-left flex flex-col justify-between transition-colors " +
                    (isSelected
                      ? "border-[var(--color-brand-violet)] bg-[var(--color-brand-violet)]/15"
                      : "border-white/10 hover:border-white/30 bg-white/5")
                  }
                >
                  <span className="text-[11px] text-white/70">{cell.day}</span>
                  <span className="flex flex-wrap gap-0.5">
                    {evs.slice(0, 4).map((e, idx) => (
                      <span
                        key={idx}
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: SEVERITY_COLOR[e.severity] }}
                        aria-label={`severity ${e.severity}`}
                      />
                    ))}
                    {evs.length > 4 ? (
                      <span className="text-[9px] text-white/45">+{evs.length - 4}</span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-3 mt-4 text-[10px] text-white/45 uppercase tracking-wider">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SEVERITY_COLOR[1] }} /> minor
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SEVERITY_COLOR[2] }} /> notable
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SEVERITY_COLOR[3] }} /> major
          </span>
        </div>
      </Card>

      <Card className="!p-5">
        <h3 className="text-xs uppercase tracking-wider text-[var(--color-brand-gold)] mb-3">
          {selected
            ? new Date(selected.events[0]?.date ?? Date.UTC(cursorMonth.getUTCFullYear(), cursorMonth.getUTCMonth(), Number(selected.key.split("-").pop()))).toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })
            : "Select a day"}
        </h3>
        {selected && selected.events.length === 0 ? (
          <p className="text-xs text-white/45">No events on this day.</p>
        ) : selected ? (
          <ul className="space-y-2 text-sm">
            {selected.events.map((e, i) => (
              <li key={i} className="rounded-md border border-white/10 bg-white/5 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: SEVERITY_COLOR[e.severity] }}
                  />
                  <span className="text-[10px] uppercase tracking-wider text-white/50">{e.type.replace(/_/g, " ")}</span>
                </div>
                <div className="text-white mt-1">{describeEvent(e)}</div>
                <div className="text-[10px] text-white/40 mt-0.5">
                  {new Date(e.date).toUTCString().slice(17, 22)} UTC
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-white/45">Click a day in the grid to see events.</p>
        )}
      </Card>
    </div>
  );
}
