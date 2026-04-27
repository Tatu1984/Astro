import { cn } from "@/frontend/utils/cn";

/** Background-only aurora effect — pair with `relative overflow-hidden` parent. */
export function Aurora({ className }: { className?: string }) {
  return (
    <div className={cn("aurora absolute inset-0 -z-10", className)} aria-hidden />
  );
}

export function StarField({ className }: { className?: string }) {
  return (
    <div className={cn("starfield absolute inset-0 -z-10", className)} aria-hidden />
  );
}
