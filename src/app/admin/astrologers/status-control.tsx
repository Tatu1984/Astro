"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/frontend/components/ui/Button";

type Status = "PENDING" | "ACTIVE" | "SUSPENDED";

const ACTIONS: Record<Status, { label: string; next: "ACTIVE" | "SUSPENDED"; tone: "primary" | "destructive" | "outline" }[]> = {
  PENDING: [
    { label: "Approve", next: "ACTIVE", tone: "primary" },
    { label: "Reject", next: "SUSPENDED", tone: "outline" },
  ],
  ACTIVE: [
    { label: "Suspend", next: "SUSPENDED", tone: "destructive" },
  ],
  SUSPENDED: [
    { label: "Reactivate", next: "ACTIVE", tone: "primary" },
  ],
};

export function StatusControl({ astrologerId, status }: { astrologerId: string; status: Status }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const actions = ACTIONS[status];

  function run(nextStatus: "ACTIVE" | "SUSPENDED") {
    setError(null);
    start(async () => {
      const res = await fetch(`/api/admin/astrologers/${astrologerId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? `failed (${res.status})`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        {actions.map((a) => (
          <Button
            key={a.next}
            variant={a.tone}
            size="sm"
            onClick={() => run(a.next)}
            disabled={pending}
          >
            {pending ? "…" : a.label}
          </Button>
        ))}
      </div>
      {error ? <span className="text-[11px] text-[var(--color-brand-rose)]">{error}</span> : null}
    </div>
  );
}
