"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

import { Button } from "@/frontend/components/ui/Button";

type Kind = "NATAL_FULL" | "CAREER_WEALTH" | "LOVE_MARRIAGE" | "HEALTH" | "EDUCATION" | "SPIRITUAL";

export function GenerateReportButton({
  kind,
  profileId,
}: {
  kind: Kind;
  profileId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!profileId) {
    return (
      <Button variant="outline" size="sm" disabled title="Add a profile first">
        Add a profile first
      </Button>
    );
  }

  function onClick() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, kind }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? `failed (${res.status})`);
        return;
      }
      const { report } = (await res.json()) as { report: { id: string } };
      router.push(`/user/reports/${report.id}`);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="gold" size="sm" onClick={onClick} disabled={pending}>
        <Sparkles className="h-3.5 w-3.5" />
        {pending ? "Generating…" : "Generate"}
      </Button>
      {error ? <span className="text-[11px] text-[var(--color-brand-rose)]">{error}</span> : null}
    </div>
  );
}
