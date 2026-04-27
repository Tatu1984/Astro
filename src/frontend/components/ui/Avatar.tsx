import { cn } from "@/frontend/utils/cn";

export function Avatar({
  initials = "M",
  size = 40,
  tone = "violet",
  className,
}: {
  initials?: string;
  size?: number;
  tone?: "violet" | "gold" | "aqua" | "rose";
  className?: string;
}) {
  const tones = {
    violet: "from-[var(--color-brand-violet)] to-[#5d3df0]",
    gold: "from-[var(--color-brand-gold)] to-[#d4a93a]",
    aqua: "from-[var(--color-brand-aqua)] to-[#22b6a3]",
    rose: "from-[var(--color-brand-rose)] to-[#e6536c]",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold text-white bg-gradient-to-br ring-2 ring-white/10",
        tones[tone],
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}
