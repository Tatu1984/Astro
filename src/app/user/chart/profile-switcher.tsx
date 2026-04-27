"use client";

import { useRouter, useSearchParams } from "next/navigation";

export interface ProfileOption {
  id: string;
  fullName: string;
}

export function ProfileSwitcher({
  profiles,
  activeId,
}: {
  profiles: ProfileOption[];
  activeId: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  if (profiles.length <= 1) return null;

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(params);
    next.set("profile", e.target.value);
    router.push(`?${next.toString()}`);
  }

  return (
    <select
      value={activeId}
      onChange={onChange}
      className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 h-8 text-xs text-white"
    >
      {profiles.map((p) => (
        <option key={p.id} value={p.id}>
          {p.fullName}
        </option>
      ))}
    </select>
  );
}
