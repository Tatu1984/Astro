"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, Sparkles } from "lucide-react";

import { Button } from "@/frontend/components/ui/Button";

interface ProfileOption {
  id: string;
  fullName: string;
}

type Kind = "ROMANTIC" | "FRIENDSHIP" | "BUSINESS" | "FAMILY";

export function GenerateCompatibilityForm({ profiles }: { profiles: ProfileOption[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("ROMANTIC");
  const [profileAId, setProfileAId] = useState(profiles[0]?.id ?? "");
  const [profileBId, setProfileBId] = useState(profiles[1]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (profiles.length < 2) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5 text-sm text-white/70">
        You need at least <strong>two birth profiles</strong> to generate a compatibility report. Add a partner / friend / family member under <a href="/user/profile" className="text-[var(--color-brand-gold)] hover:underline">Profile</a>.
      </div>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (profileAId === profileBId) {
      setError("Pick two different profiles.");
      return;
    }
    start(async () => {
      const res = await fetch("/api/compatibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileAId, profileBId, kind }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? `failed (${res.status})`);
        return;
      }
      const { compatibility } = (await res.json()) as { compatibility: { id: string } };
      router.push(`/user/compatibility/${compatibility.id}`);
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4"
    >
      <div>
        <label className="text-xs uppercase tracking-wider text-white/45 block mb-2">Kind</label>
        <div className="flex flex-wrap gap-1.5">
          {(["ROMANTIC", "FRIENDSHIP", "BUSINESS", "FAMILY"] as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={
                kind === k
                  ? "px-3 py-1.5 text-xs font-semibold rounded-md bg-[var(--color-brand-violet)] text-white"
                  : "px-3 py-1.5 text-xs rounded-md bg-[var(--color-card)] border border-[var(--color-border)] text-white/65 hover:text-white"
              }
            >
              {k.charAt(0) + k.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ProfileSelect label="Profile A" profiles={profiles} value={profileAId} onChange={setProfileAId} />
        <ProfileSelect label="Profile B" profiles={profiles} value={profileBId} onChange={setProfileBId} />
      </div>

      {error ? <p className="text-xs text-[var(--color-brand-rose)]">{error}</p> : null}

      <Button type="submit" variant="gold" size="md" disabled={pending || profileAId === profileBId}>
        {kind === "ROMANTIC" ? <Heart className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        {pending ? "Computing…" : "Generate compatibility"}
      </Button>
    </form>
  );
}

function ProfileSelect({
  label,
  profiles,
  value,
  onChange,
}: {
  label: string;
  profiles: ProfileOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-white/45 block mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm text-white"
      >
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.fullName}
          </option>
        ))}
      </select>
    </div>
  );
}
