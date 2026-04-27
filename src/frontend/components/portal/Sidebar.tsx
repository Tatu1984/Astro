"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/frontend/utils/cn";
import { Sparkles } from "lucide-react";

export type NavItem = { href: string; label: string; icon?: React.ReactNode };

export function Sidebar({
  brand,
  badge,
  items,
  light = false,
}: {
  brand: string;
  badge?: string;
  items: NavItem[];
  light?: boolean;
}) {
  const pathname = usePathname();
  return (
    <aside
      className={cn(
        "sticky top-0 h-dvh w-60 shrink-0 flex flex-col gap-1 px-3 py-5 border-r",
        light
          ? "bg-[var(--color-surface-2-light)] border-[var(--color-border-light)] text-[var(--color-ink-light)]"
          : "bg-[#170f2c] border-[var(--color-border)] text-white",
      )}
    >
      <div className="flex items-center gap-2 px-2 mb-4">
        <Sparkles className="h-5 w-5 text-[var(--color-brand-gold)]" />
        <span className="font-semibold tracking-tight">{brand}</span>
        {badge && (
          <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--color-brand-gold)] text-[#1a1530]">
            {badge}
          </span>
        )}
      </div>
      <nav className="flex-1 flex flex-col gap-0.5">
        {items.map((it) => {
          const active = pathname === it.href || pathname?.startsWith(it.href + "/");
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-[var(--color-brand-violet)] text-white shadow-[0_8px_24px_-12px_rgba(124,92,255,0.7)]"
                  : light
                  ? "text-[var(--color-ink-light)] hover:bg-white/40"
                  : "text-white/85 hover:bg-white/5",
              )}
            >
              {it.icon}
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className={cn("text-[10px] px-2 pt-3 border-t",
        light ? "border-[var(--color-border-light)] text-[var(--color-ink-muted-light)]"
              : "border-white/10 text-white/40")}>
        v1.0 · prototype
      </div>
    </aside>
  );
}
