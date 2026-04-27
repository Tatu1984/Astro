"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { cn } from "@/frontend/utils/cn";

export function SignOutButton({ light = false }: { light?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 h-8 text-xs font-medium transition-colors",
        light
          ? "border-[var(--color-border-light)] text-[var(--color-ink-light)] hover:bg-[var(--color-surface-2-light)]"
          : "border-[var(--color-border)] text-[var(--color-ink)] hover:bg-white/5",
      )}
    >
      <LogOut className="h-3.5 w-3.5" />
      Sign out
    </button>
  );
}
