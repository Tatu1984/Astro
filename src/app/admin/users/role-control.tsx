"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/frontend/components/ui/Button";

type Role = "USER" | "ASTROLOGER" | "ADMIN" | "MODERATOR";

export function RoleControl({ userId, role }: { userId: string; role: Role }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (role === "ADMIN" || role === "MODERATOR") {
    return <span className="text-xs text-[var(--color-ink-muted-light)]">protected</span>;
  }

  const targetRole: Role = role === "USER" ? "ASTROLOGER" : "USER";
  const label = targetRole === "ASTROLOGER" ? "Promote to astrologer" : "Demote to user";

  function onClick() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: targetRole }),
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
      <Button
        variant={targetRole === "ASTROLOGER" ? "primary" : "outline"}
        size="sm"
        onClick={onClick}
        disabled={pending}
      >
        {pending ? "…" : label}
      </Button>
      {error ? (
        <span className="text-[11px] text-[var(--color-brand-rose)]">{error}</span>
      ) : null}
    </div>
  );
}
