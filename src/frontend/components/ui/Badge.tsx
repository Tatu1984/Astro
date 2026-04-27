import * as React from "react";
import { cn } from "@/frontend/utils/cn";

export function Badge({
  className,
  tone = "violet",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "violet" | "gold" | "aqua" | "rose" | "muted";
}) {
  const tones: Record<string, string> = {
    violet: "bg-[var(--color-brand-violet)]/15 text-[var(--color-brand-violet)] ring-[var(--color-brand-violet)]/30",
    gold:   "bg-[var(--color-brand-gold)]/15 text-[var(--color-brand-gold)] ring-[var(--color-brand-gold)]/30",
    aqua:   "bg-[var(--color-brand-aqua)]/15 text-[var(--color-brand-aqua)] ring-[var(--color-brand-aqua)]/30",
    rose:   "bg-[var(--color-brand-rose)]/15 text-[var(--color-brand-rose)] ring-[var(--color-brand-rose)]/30",
    muted:  "bg-white/5 text-[var(--color-ink-muted)] ring-white/10",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ring-inset",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
