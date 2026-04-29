"use client";

import { use, useEffect, useState } from "react";

import { TopBar } from "@/frontend/components/portal/TopBar";
import { Button } from "@/frontend/components/ui/Button";
import { Card } from "@/frontend/components/ui/Card";

type Booking = {
  id: string;
  scheduledAt: string;
  durationMin: number;
  status: string;
  priceInr: number;
  service: { title: string; kind: string };
  astrologerProfile: { id: string; fullName: string };
  review: { id: string; rating: number; comment: string | null } | null;
  consultSession?: { recordingUrl: string | null } | null;
};

type JoinResp = { roomUrl: string; roomName: string; token: string };

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [join, setJoin] = useState<JoinResp | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/consult/bookings/${id}`);
      if (!res.ok) throw new Error((await res.json()).error ?? "load failed");
      setBooking((await res.json()).booking);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function joinNow() {
    setJoining(true);
    setError(null);
    try {
      const res = await fetch(`/api/consult/bookings/${id}/join`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? "join failed");
      setJoin(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "join failed");
    } finally {
      setJoining(false);
    }
  }

  async function cancel() {
    if (!confirm("Cancel this booking?")) return;
    const res = await fetch(`/api/consult/bookings/${id}/cancel`, { method: "POST" });
    if (res.ok) load();
  }

  async function submitReview() {
    setError(null);
    try {
      const res = await fetch(`/api/consult/bookings/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "review failed");
      setSubmitted(true);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "review failed");
    }
  }

  if (loading) return <p className="p-6 text-sm text-white/55">Loading…</p>;
  if (!booking) return <p className="p-6 text-sm text-[var(--color-brand-rose)]">{error ?? "not found"}</p>;

  const scheduled = new Date(booking.scheduledAt);
  const canCancel = booking.status === "PENDING_PAYMENT" || booking.status === "CONFIRMED";
  const canReview = booking.status === "COMPLETED" && !booking.review && !submitted;
  const canJoin = booking.status === "CONFIRMED" || booking.status === "IN_PROGRESS";
  const isStub = join?.roomUrl?.startsWith("stub://");
  const hasRecording = booking.status === "COMPLETED" && Boolean(booking.consultSession?.recordingUrl);

  async function watchRecording() {
    setError(null);
    try {
      const res = await fetch(`/api/consult/bookings/${id}/recording-url`);
      if (!res.ok) throw new Error((await res.json()).error ?? "no recording");
      const { url } = (await res.json()) as { url: string };
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "no recording");
    }
  }

  return (
    <>
      <TopBar title={`Booking with ${booking.astrologerProfile.fullName}`} subtitle={booking.service.title} />
      <div className="p-6 max-w-3xl space-y-4">
        {error ? <div className="text-sm text-[var(--color-brand-rose)]">{error}</div> : null}

        <Card className="!p-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Field label="Status" value={booking.status} />
            <Field label="When" value={scheduled.toLocaleString()} />
            <Field label="Duration" value={`${booking.durationMin}min`} />
            <Field label="Price" value={`₹${booking.priceInr}`} />
          </div>
          <div className="mt-3 flex gap-2 flex-wrap">
            {canJoin ? (
              <Button onClick={joinNow} disabled={joining}>{joining ? "Connecting…" : "Join now"}</Button>
            ) : null}
            {canCancel ? (
              <Button variant="destructive" onClick={cancel}>Cancel</Button>
            ) : null}
            {hasRecording ? (
              <Button variant="ghost" onClick={watchRecording}>
                Watch recording
              </Button>
            ) : null}
          </div>
        </Card>

        {join ? (
          <Card className="!p-0 overflow-hidden">
            {isStub ? (
              <div className="p-4 text-sm text-white/70">
                <p>Stub mode (no DAILY_API_KEY)</p>
                <p className="text-xs">Room URL: <code>{join.roomUrl}</code></p>
                <p className="text-xs">Token: <code>{join.token}</code></p>
              </div>
            ) : (
              <iframe
                src={`${join.roomUrl}?t=${encodeURIComponent(join.token)}`}
                allow="camera; microphone; fullscreen; speaker; display-capture"
                className="w-full h-[600px] border-0"
              />
            )}
          </Card>
        ) : null}

        {canReview ? (
          <Card className="!p-4 space-y-3">
            <h3 className="font-semibold text-[var(--color-brand-gold)]">Leave a review</h3>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  className={n <= rating ? "text-[var(--color-brand-gold)]" : "text-white/25"}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full min-h-[100px] bg-white/5 border border-[var(--color-border)] rounded p-2 text-sm text-white"
              placeholder="Your feedback (optional)"
            />
            <Button onClick={submitReview}>Submit review</Button>
          </Card>
        ) : null}

        {booking.review ? (
          <Card className="!p-4">
            <h3 className="font-semibold text-[var(--color-brand-gold)] mb-1">Your review</h3>
            <p className="text-sm text-[var(--color-brand-gold)]">
              {"★".repeat(booking.review.rating)}{"☆".repeat(5 - booking.review.rating)}
            </p>
            {booking.review.comment ? <p className="text-sm text-white/75 mt-1">{booking.review.comment}</p> : null}
          </Card>
        ) : null}
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-white/40">{label}</p>
      <p className="text-white/85">{value}</p>
    </div>
  );
}
