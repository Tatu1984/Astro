"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";

import { TopBar } from "@/frontend/components/portal/TopBar";
import { Button } from "@/frontend/components/ui/Button";
import { Card } from "@/frontend/components/ui/Card";
import { openRazorpayCheckout } from "@/frontend/lib/razorpay";
import type { RazorpayCheckoutResponse } from "@/shared/types/payment";

type Service = {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  durationMin: number;
  priceInr: number;
  astrologerProfileId: string;
};

type Astrologer = {
  id: string;
  fullName: string;
  languages: string[];
  schedules: Array<{ weekday: number; startMinutes: number; endMinutes: number; timezone: string }>;
  scheduleExceptions: Array<{ date: string; isAvailable: boolean; startMinutes: number | null; endMinutes: number | null }>;
  services: Service[];
};

type Slot = { iso: string; label: string };

function buildNext14DaysSlots(astro: Astrologer, durationMin: number): Slot[] {
  const out: Slot[] = [];
  const now = Date.now();
  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + dayOffset);
    const weekday = d.getDay();
    const dateKey = d.toISOString().slice(0, 10);
    const exception = astro.scheduleExceptions.find((e) => e.date.startsWith(dateKey));
    if (exception && !exception.isAvailable) continue;

    const dayWindows = astro.schedules.filter((s) => s.weekday === weekday);
    for (const w of dayWindows) {
      for (let m = w.startMinutes; m + durationMin <= w.endMinutes; m += 30) {
        const slot = new Date(d);
        slot.setMinutes(m);
        if (slot.getTime() <= now) continue;
        out.push({
          iso: slot.toISOString(),
          label: slot.toLocaleString("en-GB", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }),
        });
      }
    }
  }
  return out.slice(0, 200);
}

export default function BookPage({ params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = use(params);
  const router = useRouter();
  const [service, setService] = useState<Service | null>(null);
  const [astro, setAstro] = useState<Astrologer | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // First, find which astrologer owns this service. We GET via a search call.
        const allRes = await fetch("/api/consult/astrologers");
        const all = (await allRes.json()) as { astrologers: Array<{ id: string; services: Service[] }> };
        const match = all.astrologers.find((a) => a.services.some((s) => s.id === serviceId));
        if (!match) throw new Error("service not found in any active astrologer");
        const detailRes = await fetch(`/api/consult/astrologers/${match.id}`);
        const detail = (await detailRes.json()) as { astrologer: Astrologer };
        setAstro(detail.astrologer);
        const svc = detail.astrologer.services.find((s) => s.id === serviceId);
        if (!svc) throw new Error("service not found");
        setService(svc);
      } catch (e) {
        setError(e instanceof Error ? e.message : "load failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [serviceId]);

  const slots = useMemo(() => {
    if (!service || !astro) return [];
    return buildNext14DaysSlots(astro, service.durationMin);
  }, [service, astro]);

  async function book() {
    if (!service || !astro || !selectedSlot) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/consult/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          astrologerProfileId: astro.id,
          serviceId: service.id,
          scheduledAt: selectedSlot,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "booking failed");
      const data = (await res.json()) as {
        booking: { id: string };
        checkout: { orderId: string; keyId: string; amountPaise: number; currency: "INR"; stub: boolean };
      };

      if (data.checkout.stub) {
        // Dev: skip Razorpay UI, call verify with stub data so booking moves to CONFIRMED.
        const v = await fetch("/api/payments/razorpay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId: data.booking.id,
            razorpayOrderId: data.checkout.orderId,
            razorpayPaymentId: `pay_stub_${data.booking.id}`,
            razorpaySignature: "stub_signature",
          }),
        });
        if (!v.ok) throw new Error("stub verify failed");
        router.push(`/user/consult/bookings/${data.booking.id}`);
        return;
      }

      const result: RazorpayCheckoutResponse = await openRazorpayCheckout({
        key: data.checkout.keyId,
        amount: data.checkout.amountPaise,
        currency: "INR",
        name: "Astro · Consult",
        description: service.title,
        order_id: data.checkout.orderId,
      });

      const v = await fetch("/api/payments/razorpay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: data.booking.id,
          razorpayOrderId: result.razorpay_order_id,
          razorpayPaymentId: result.razorpay_payment_id,
          razorpaySignature: result.razorpay_signature,
        }),
      });
      if (!v.ok) throw new Error((await v.json()).error ?? "verify failed");
      router.push(`/user/consult/bookings/${data.booking.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "booking failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="p-6 text-sm text-white/55">Loading…</p>;
  if (error && !service) return <p className="p-6 text-sm text-[var(--color-brand-rose)]">{error}</p>;
  if (!service || !astro) return null;

  return (
    <>
      <TopBar title={`Book ${service.title}`} subtitle={`${astro.fullName} · ₹${service.priceInr} · ${service.durationMin}min`} />
      <div className="p-6 max-w-3xl space-y-4">
        {error ? <div className="text-sm text-[var(--color-brand-rose)]">{error}</div> : null}
        <Card className="!p-4">
          <h3 className="font-semibold text-[var(--color-brand-gold)] mb-3">Pick a slot (next 14 days)</h3>
          {slots.length === 0 ? (
            <p className="text-sm text-white/55">No availability — try another service or check back later.</p>
          ) : (
            <div className="grid sm:grid-cols-3 gap-2 max-h-[480px] overflow-y-auto">
              {slots.map((s) => (
                <button
                  key={s.iso}
                  onClick={() => setSelectedSlot(s.iso)}
                  className={
                    "rounded border px-2 py-1.5 text-xs " +
                    (selectedSlot === s.iso
                      ? "bg-[var(--color-brand-violet)] border-transparent text-white"
                      : "border-[var(--color-border)] text-white/75 hover:bg-white/5")
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </Card>

        <div className="flex justify-end">
          <Button onClick={book} disabled={!selectedSlot || submitting}>
            {submitting ? "Processing…" : `Pay ₹${service.priceInr}`}
          </Button>
        </div>
      </div>
    </>
  );
}
