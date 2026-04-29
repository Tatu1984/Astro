"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/frontend/components/ui/Button";

export function PayoutActions({ payoutId }: { payoutId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function call(action: "approve" | "reject") {
    setPending(true);
    try {
      const res = await fetch(`/api/admin/payouts/${payoutId}/${action}`, { method: "POST" });
      if (!res.ok) alert((await res.json()).error ?? "failed");
      else router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex gap-2 justify-end">
      <Button size="sm" onClick={() => call("approve")} disabled={pending}>Approve</Button>
      <Button size="sm" variant="destructive" onClick={() => call("reject")} disabled={pending}>Reject</Button>
    </div>
  );
}
