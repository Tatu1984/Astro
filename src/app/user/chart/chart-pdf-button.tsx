"use client";

import { useState } from "react";

import { Button } from "@/frontend/components/ui/shadcn/button";

export function ChartPdfButton({ chartId }: { chartId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/charts/${chartId}/pdf`);
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "PDF generation failed.");
        return;
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" size="sm" onClick={onClick} disabled={busy}>
        {busy ? "Preparing PDF…" : "Download PDF"}
      </Button>
      {error ? <span className="text-[10px] text-[var(--color-brand-rose)]">{error}</span> : null}
    </div>
  );
}
