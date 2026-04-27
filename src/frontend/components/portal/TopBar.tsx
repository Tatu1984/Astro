import { Avatar } from "@/frontend/components/ui/Avatar";
import { SignOutButton } from "@/frontend/components/portal/SignOutButton";
import { cn } from "@/frontend/utils/cn";

export function TopBar({
  title,
  subtitle,
  right,
  light = false,
  initials = "M",
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  light?: boolean;
  initials?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex items-center justify-between gap-3 px-6 h-14 border-b backdrop-blur",
        light
          ? "bg-white/85 border-[var(--color-border-light)]"
          : "bg-[var(--color-bg)]/85 border-[var(--color-border)]",
      )}
    >
      <div className="min-w-0">
        <h1 className={cn("font-semibold text-base leading-tight truncate", light ? "text-[var(--color-ink-light)]" : "text-white")}>
          {title}
        </h1>
        {subtitle && (
          <p className={cn("text-xs truncate", light ? "text-[var(--color-ink-muted-light)]" : "text-white/55")}>
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {right}
        <SignOutButton light={light} />
        <Avatar initials={initials} size={32} />
      </div>
    </header>
  );
}
