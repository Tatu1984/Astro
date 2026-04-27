import * as React from "react";
import { cn } from "@/frontend/utils/cn";

export function CardLight({
  className,
  accent,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { accent?: "gold" | "violet" | "aqua" | "rose" }) {
  return (
    <div
      className={cn(
        "relative bg-white border border-[var(--color-border-light)] rounded-[var(--radius-lg)] p-5",
        "shadow-[0_4px_16px_-12px_rgba(124,92,255,0.18)]",
        accent &&
          `before:content-[''] before:absolute before:left-0 before:top-3 before:bottom-3 before:w-1 before:rounded-full before:bg-[var(--color-brand-${accent})]`,
        className,
      )}
      {...props}
    />
  );
}
