"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { TopBar } from "@/frontend/components/portal/TopBar";
import { Badge } from "@/frontend/components/ui/Badge";
import { Card } from "@/frontend/components/ui/Card";

type Booking = {
  id: string;
  scheduledAt: string;
  durationMin: number;
  status: string;
  priceInr: number;
  service: { title: string; kind: string };
  astrologerProfile: { fullName: string };
  review: { id: string; rating: number } | null;
};

const TONE: Record<string, "aqua" | "gold" | "rose"> = {
  CONFIRMED: "aqua",
  IN_PROGRESS: "gold",
  COMPLETED: "aqua",
  PENDING_PAYMENT: "gold",
  CANCELLED: "rose",
  NO_SHOW: "rose",
  REFUNDED: "rose",
};

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/consult/bookings")
      .then((r) => r.json())
      .then((d: { bookings: Booking[] }) => setBookings(d.bookings ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const now = Date.now();
    if (tab === "upcoming") {
      return bookings.filter(
        (b) => new Date(b.scheduledAt).getTime() > now && b.status !== "CANCELLED" && b.status !== "REFUNDED",
      );
    }
    return bookings.filter(
      (b) => new Date(b.scheduledAt).getTime() <= now || b.status === "CANCELLED" || b.status === "REFUNDED",
    );
  }, [bookings, tab]);

  return (
    <>
      <TopBar title="My consults" subtitle="Sessions with verified astrologers" />
      <div className="p-6 space-y-4">
        <div className="flex gap-1 text-xs">
          <button
            onClick={() => setTab("upcoming")}
            className={
              "px-3 py-1.5 rounded " +
              (tab === "upcoming" ? "bg-[var(--color-brand-violet)] text-white" : "text-white/65 hover:bg-white/5")
            }
          >
            Upcoming
          </button>
          <button
            onClick={() => setTab("past")}
            className={
              "px-3 py-1.5 rounded " +
              (tab === "past" ? "bg-[var(--color-brand-violet)] text-white" : "text-white/65 hover:bg-white/5")
            }
          >
            Past
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-white/55">Loading…</p>
        ) : filtered.length === 0 ? (
          <Card className="!p-4">
            <p className="text-sm text-white/55">Nothing here yet.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((b) => (
              <Link key={b.id} href={`/user/consult/bookings/${b.id}`}>
                <Card className="!p-4 hover:bg-white/5 cursor-pointer">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-white">{b.astrologerProfile.fullName}</div>
                      <div className="text-xs text-white/55">
                        {b.service.title} · {b.service.kind} · {b.durationMin}min · ₹{b.priceInr}
                      </div>
                    </div>
                    <div className="text-xs text-white/65">
                      {new Date(b.scheduledAt).toLocaleString("en-GB", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <Badge tone={TONE[b.status] ?? "gold"}>{b.status}</Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
