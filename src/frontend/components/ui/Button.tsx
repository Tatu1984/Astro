import * as React from "react";
import { cn } from "@/frontend/utils/cn";

type Variant = "primary" | "gold" | "ghost" | "outline" | "destructive";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-[var(--color-brand-violet)] text-white hover:brightness-110 shadow-[0_8px_24px_-12px_rgba(124,92,255,0.7)]",
  gold:
    "bg-[var(--color-brand-gold)] text-[#1a1530] hover:brightness-105 shadow-[0_8px_24px_-12px_rgba(244,201,93,0.7)]",
  ghost:
    "bg-transparent text-[var(--color-ink)] hover:bg-white/5",
  outline:
    "bg-transparent text-[var(--color-ink)] border border-[var(--color-border)] hover:bg-white/5",
  destructive:
    "bg-[var(--color-brand-rose)] text-white hover:brightness-110",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  pill?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", pill, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-violet)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]",
        "disabled:opacity-50 disabled:pointer-events-none",
        pill ? "rounded-full" : "rounded-[var(--radius-md)]",
        SIZES[size],
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
