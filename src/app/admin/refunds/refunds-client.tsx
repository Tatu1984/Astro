"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/frontend/components/ui/Button";
import { CardLight } from "@/frontend/components/ui/CardLight";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/frontend/components/ui/shadcn/dialog";
import { Input } from "@/frontend/components/ui/shadcn/input";
import { Label } from "@/frontend/components/ui/shadcn/label";
import { Textarea } from "@/frontend/components/ui/shadcn/textarea";
import { formatInr } from "@/shared/format";

interface Row {
  id: string;
  status: string;
  priceInr: number;
  razorpayPaymentId: string | null;
  scheduledAt: string;
  updatedAt: string;
  user: { id: string; name: string | null; email: string | null };
  astrologerProfile: { id: string; fullName: string };
  service: { id: string; title: string; kind: string };
  refunded: {
    refundedAt: string;
    amountInr: number | null;
    reason: string | null;
    razorpayRefundId: string | null;
  } | null;
}

export function RefundsClient() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await fetch("/api/admin/refunds", { cache: "no-store" });
      if (!res.ok) throw new Error(`failed (${res.status})`);
      const j = (await res.json()) as { bookings: Row[] };
      setRows(j.bookings);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "load failed");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-5">
      {err ? (
        <CardLight className="border-[var(--color-brand-rose)]/40">
          <p className="text-sm text-[var(--color-brand-rose)]">{err}</p>
        </CardLight>
      ) : null}

      <CardLight className="!p-0 overflow-hidden">
        {!rows ? (
          <div className="p-8 text-sm text-center text-[var(--color-ink-muted-light)]">Loading…</div>
        ) : !rows.length ? (
          <div className="p-8 text-sm text-center text-[var(--color-ink-muted-light)]">
            No refundable bookings.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-2-light)] text-left text-xs uppercase tracking-wider text-[var(--color-ink-muted-light)]">
              <tr>
                <th className="px-4 py-3 font-medium">Booking</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Astrologer</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Price</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-[var(--color-border-light)]">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.service.title}</div>
                    <div className="text-[11px] text-[var(--color-ink-muted-light)] font-mono">
                      #{r.id.slice(0, 8)} · {r.service.kind}
                    </div>
                    <div className="text-[11px] text-[var(--color-ink-muted-light)]">
                      {new Date(r.scheduledAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-ink-muted-light)]">
                    {r.user.email ?? r.user.name ?? r.user.id}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-ink-muted-light)]">{r.astrologerProfile.fullName}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatInr(r.priceInr)}</td>
                  <td className="px-4 py-3 text-right">
                    {r.refunded ? (
                      <div className="text-xs text-[var(--color-ink-muted-light)]">
                        Refunded {formatInr(r.refunded.amountInr ?? r.priceInr)}
                        <div className="text-[10px]">
                          on {new Date(r.refunded.refundedAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}
                        </div>
                      </div>
                    ) : !r.razorpayPaymentId ? (
                      <span className="text-xs text-[var(--color-ink-muted-light)]">no payment</span>
                    ) : (
                      <Button variant="destructive" size="sm" onClick={() => setPending(r)}>
                        Refund
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardLight>

      {pending ? <RefundDialog row={pending} onClose={() => setPending(null)} onDone={load} /> : null}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "REFUNDED"
      ? "border-[var(--color-brand-rose)]/40 bg-[var(--color-brand-rose)]/10 text-[#a13333]"
      : status === "COMPLETED"
        ? "border-[var(--color-brand-aqua)]/40 bg-[var(--color-brand-aqua)]/10 text-[#0a8273]"
        : "border-[var(--color-brand-gold)]/40 bg-[var(--color-brand-gold)]/15 text-[#a17800]";
  return (
    <span className={`inline-block rounded-md border px-2 py-0.5 text-xs ${tone}`}>{status}</span>
  );
}

function RefundDialog({
  row,
  onClose,
  onDone,
}: {
  row: Row;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [partial, setPartial] = useState(false);
  const [amountInr, setAmountInr] = useState(row.priceInr);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/bookings/${row.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountInr: partial ? amountInr : undefined,
          reason: reason.trim(),
        }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string; alreadyRefunded?: boolean } | null;
      if (res.status === 409 && body?.alreadyRefunded) {
        setErr("Already refunded");
      } else if (!res.ok) {
        setErr(body?.error ?? `failed (${res.status})`);
        return;
      }
      onClose();
      await onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "refund failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Refund booking</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <p className="text-sm text-muted-foreground">
            <strong>{row.service.title}</strong> · {formatInr(row.priceInr)} · payment{" "}
            <span className="font-mono text-xs">{row.razorpayPaymentId}</span>
          </p>
          <div className="space-y-1.5">
            <label className="inline-flex items-center cursor-pointer gap-2 text-sm">
              <input
                type="checkbox"
                checked={partial}
                onChange={(e) => setPartial(e.target.checked)}
                className="h-4 w-4"
              />
              Partial refund
            </label>
          </div>
          {partial ? (
            <div className="space-y-1.5">
              <Label>Amount (INR)</Label>
              <Input
                type="number"
                min={1}
                max={row.priceInr}
                value={amountInr}
                onChange={(e) => setAmountInr(Math.min(row.priceInr, Math.max(1, Number(e.target.value) || 0)))}
              />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label>Reason *</Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              placeholder="Customer complaint, fraud, scheduling error…"
              required
            />
          </div>
          {err ? <p className="text-sm text-[var(--color-brand-rose)]">{err}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={submitting || !reason.trim()}
            onClick={submit}
          >
            {submitting ? "Refunding…" : `Refund ${formatInr(partial ? amountInr : row.priceInr)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
