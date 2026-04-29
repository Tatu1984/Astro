"use client";

import { useEffect, useMemo, useState } from "react";

import { TopBar } from "@/frontend/components/portal/TopBar";
import { Button } from "@/frontend/components/ui/Button";
import { Card } from "@/frontend/components/ui/Card";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SLOT_MIN = 30;
const SLOTS_PER_DAY = (24 * 60) / SLOT_MIN; // 48

type Slot = { weekday: number; startMinutes: number; endMinutes: number; timezone: string };
type Exception = {
  id: string;
  date: string;
  isAvailable: boolean;
  startMinutes: number | null;
  endMinutes: number | null;
};

function makeMatrix(slots: Slot[]): boolean[][] {
  const m: boolean[][] = Array.from({ length: 7 }, () => Array(SLOTS_PER_DAY).fill(false));
  for (const s of slots) {
    const startIx = Math.floor(s.startMinutes / SLOT_MIN);
    const endIx = Math.ceil(s.endMinutes / SLOT_MIN);
    for (let i = startIx; i < endIx; i++) m[s.weekday][i] = true;
  }
  return m;
}

function matrixToSlots(m: boolean[][], tz: string): Slot[] {
  const out: Slot[] = [];
  for (let d = 0; d < 7; d++) {
    let i = 0;
    while (i < SLOTS_PER_DAY) {
      if (m[d][i]) {
        let j = i;
        while (j < SLOTS_PER_DAY && m[d][j]) j++;
        out.push({
          weekday: d,
          startMinutes: i * SLOT_MIN,
          endMinutes: j * SLOT_MIN,
          timezone: tz,
        });
        i = j;
      } else i++;
    }
  }
  return out;
}

function fmtSlotLabel(idx: number): string {
  const m = idx * SLOT_MIN;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}

export default function SchedulePage() {
  const [matrix, setMatrix] = useState<boolean[][]>(() =>
    Array.from({ length: 7 }, () => Array(SLOTS_PER_DAY).fill(false)),
  );
  const [tz, setTz] = useState("Asia/Kolkata");
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [exDate, setExDate] = useState("");
  const [exAvail, setExAvail] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/astrologer/schedule");
        if (!res.ok) throw new Error((await res.json()).error ?? "failed to load");
        const data = (await res.json()) as { slots: Slot[]; exceptions: Exception[] };
        setMatrix(makeMatrix(data.slots));
        if (data.slots[0]?.timezone) setTz(data.slots[0].timezone);
        setExceptions(data.exceptions);
      } catch (e) {
        setError(e instanceof Error ? e.message : "failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function toggle(d: number, i: number) {
    setMatrix((prev) => {
      const next = prev.map((row) => [...row]);
      next[d][i] = !next[d][i];
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const slots = matrixToSlots(matrix, tz);
      const res = await fetch("/api/astrologer/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "save failed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "save failed");
    } finally {
      setSaving(false);
    }
  }

  async function addException() {
    if (!exDate) return;
    const res = await fetch("/api/astrologer/schedule/exceptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: exDate, isAvailable: exAvail }),
    });
    if (res.ok) {
      const { exception } = (await res.json()) as { exception: Exception };
      setExceptions((prev) => [...prev, exception]);
      setExDate("");
    }
  }

  async function delException(id: string) {
    const res = await fetch(`/api/astrologer/schedule/exceptions/${id}`, { method: "DELETE" });
    if (res.ok) setExceptions((prev) => prev.filter((e) => e.id !== id));
  }

  const rowLabels = useMemo(() => Array.from({ length: SLOTS_PER_DAY }, (_, i) => fmtSlotLabel(i)), []);

  return (
    <>
      <TopBar title="Schedule" subtitle="Weekly availability + exceptions" />
      <div className="p-6 space-y-6">
        {error ? <div className="text-sm text-[var(--color-brand-rose)]">{error}</div> : null}
        <Card className="!p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-[var(--color-brand-gold)]">Weekly grid (30-min cells)</h3>
            <div className="flex items-center gap-2">
              <input
                value={tz}
                onChange={(e) => setTz(e.target.value)}
                className="bg-white/5 border border-[var(--color-border)] rounded px-2 py-1 text-xs text-white/80"
              />
              <Button size="sm" onClick={save} disabled={saving || loading}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
          {loading ? (
            <p className="text-sm text-white/55">Loading…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="text-[10px]">
                <thead>
                  <tr>
                    <th className="px-1 text-white/40">time</th>
                    {WEEKDAYS.map((d) => (
                      <th key={d} className="px-1 text-white/60">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rowLabels.map((label, i) => (
                    <tr key={i}>
                      <td className="pr-2 text-white/40 align-middle whitespace-nowrap">{label}</td>
                      {Array.from({ length: 7 }, (_, d) => (
                        <td key={d} className="p-0">
                          <button
                            type="button"
                            onClick={() => toggle(d, i)}
                            className={
                              matrix[d][i]
                                ? "block w-6 h-4 bg-[var(--color-brand-aqua)]/70 hover:bg-[var(--color-brand-aqua)]"
                                : "block w-6 h-4 bg-white/5 hover:bg-white/10"
                            }
                            aria-label={`${WEEKDAYS[d]} ${label}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="!p-4">
          <h3 className="font-semibold text-[var(--color-brand-gold)] mb-3">Date exceptions</h3>
          <div className="flex items-end gap-2 mb-3 flex-wrap">
            <label className="text-xs text-white/60">
              Date
              <input
                type="date"
                value={exDate}
                onChange={(e) => setExDate(e.target.value)}
                className="ml-2 bg-white/5 border border-[var(--color-border)] rounded px-2 py-1 text-sm text-white"
              />
            </label>
            <label className="text-xs text-white/60 flex items-center gap-1.5">
              <input type="checkbox" checked={exAvail} onChange={(e) => setExAvail(e.target.checked)} />
              Available
            </label>
            <Button size="sm" onClick={addException}>Add</Button>
          </div>
          <ul className="space-y-1 text-sm">
            {exceptions.map((e) => (
              <li key={e.id} className="flex items-center gap-3">
                <span className="text-white/85">{new Date(e.date).toLocaleDateString()}</span>
                <span className={e.isAvailable ? "text-[var(--color-brand-aqua)]" : "text-[var(--color-brand-rose)]"}>
                  {e.isAvailable ? "available" : "unavailable"}
                </span>
                <button onClick={() => delException(e.id)} className="ml-auto text-xs text-white/40 hover:text-white/80">
                  remove
                </button>
              </li>
            ))}
            {exceptions.length === 0 ? <li className="text-white/40 text-xs">No exceptions yet.</li> : null}
          </ul>
        </Card>
      </div>
    </>
  );
}
