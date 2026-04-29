"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/frontend/components/ui/Button";
import { Card } from "@/frontend/components/ui/Card";

interface Note {
  id: string;
  content: string;
  bookingId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BookingOpt {
  id: string;
  label: string;
}

export function ClientNotesPanel({
  clientUserId,
  bookings,
  initialNotes,
}: {
  clientUserId: string;
  bookings: BookingOpt[];
  initialNotes: Note[];
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [draft, setDraft] = useState("");
  const [bookingId, setBookingId] = useState<string>("");
  const [pending, setPending] = useState(false);

  async function add() {
    if (!draft.trim()) return;
    setPending(true);
    try {
      const res = await fetch(`/api/astrologer/clients/${clientUserId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: draft,
          bookingId: bookingId || undefined,
        }),
      });
      if (res.ok) {
        const { note } = (await res.json()) as { note: Note };
        setNotes((arr) => [
          { ...note, createdAt: note.createdAt.toString(), updatedAt: note.updatedAt.toString() },
          ...arr,
        ]);
        setDraft("");
        setBookingId("");
      }
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this note?")) return;
    const res = await fetch(`/api/astrologer/notes/${id}`, { method: "DELETE" });
    if (res.ok) setNotes((arr) => arr.filter((n) => n.id !== id));
  }

  return (
    <Card>
      <h3 className="font-semibold text-[var(--color-brand-gold)] mb-3">Private notes</h3>
      <p className="text-xs text-white/55 mb-3">
        Only you can see these — useful for context across sessions.
      </p>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Add a note about this client…"
        rows={4}
        className="w-full rounded-md border border-[var(--color-border)] bg-white/5 px-3 py-2 text-sm text-white resize-y"
      />
      {bookings.length > 0 ? (
        <select
          value={bookingId}
          onChange={(e) => setBookingId(e.target.value)}
          className="mt-2 w-full rounded-md border border-[var(--color-border)] bg-white/5 px-3 py-2 text-sm text-white"
        >
          <option value="" className="bg-[#1a1530]">General note</option>
          {bookings.map((b) => (
            <option key={b.id} value={b.id} className="bg-[#1a1530]">
              Linked to: {b.label}
            </option>
          ))}
        </select>
      ) : null}
      <div className="mt-2">
        <Button variant="gold" size="sm" onClick={add} disabled={pending || !draft.trim()}>
          {pending ? "Adding…" : "Add note"}
        </Button>
      </div>

      <ul className="mt-5 space-y-2">
        {notes.map((n) => (
          <li
            key={n.id}
            className="rounded-md border border-[var(--color-border)] bg-white/5 px-3 py-2.5 text-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-white whitespace-pre-wrap break-words flex-1">{n.content}</p>
              <button
                type="button"
                onClick={() => remove(n.id)}
                aria-label="delete note"
                className="text-white/45 hover:text-[var(--color-brand-rose)]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-white/40 mt-1">
              {new Date(n.createdAt).toLocaleString()}
              {n.bookingId ? <> · linked to a booking</> : null}
            </p>
          </li>
        ))}
        {notes.length === 0 ? (
          <li className="text-xs text-white/45">No notes yet.</li>
        ) : null}
      </ul>
    </Card>
  );
}
