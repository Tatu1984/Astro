"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteProfileButton({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onClick() {
    if (!confirm("Delete this profile? Your charts derived from it will keep working but you won't be able to recompute.")) return;
    start(async () => {
      const res = await fetch(`/api/profiles/${profileId}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] px-2 h-7 text-xs text-white/70 hover:text-white hover:bg-white/5 disabled:opacity-50"
    >
      <Trash2 className="h-3 w-3" />
      {pending ? "…" : "Delete"}
    </button>
  );
}
