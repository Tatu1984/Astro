"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

import { Button } from "@/frontend/components/ui/shadcn/button";
import { Input } from "@/frontend/components/ui/shadcn/input";
import { Label } from "@/frontend/components/ui/shadcn/label";

const TEST_ACCOUNTS = [
  { email: "admin@astro.local", password: "Admin@2026!" },
  { email: "user1@astro.local", password: "User1@2026!" },
  { email: "user2@astro.local", password: "User2@2026!" },
];

const SHOW_DEV_HINTS = process.env.NEXT_PUBLIC_SHOW_DEV_HINTS === "1";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/post-login";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setSubmitting(false);
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    router.replace(callbackUrl);
    router.refresh();
  }

  function fill(e: { email: string; password: string }) {
    setEmail(e.email);
    setPassword(e.password);
    setError(null);
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            autoComplete="email"
            disabled={submitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            disabled={submitting}
          />
        </div>
        {error ? (
          <p className="text-sm text-[var(--color-brand-rose)]">{error}</p>
        ) : null}
        <Button
          type="submit"
          variant="default"
          size="lg"
          className="w-full"
          disabled={submitting}
        >
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-sm text-[var(--color-ink-muted)]">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-[var(--color-brand-gold)] hover:underline">
          Create one
        </Link>
      </p>

      {SHOW_DEV_HINTS ? (
        <div className="border-t border-[var(--color-border)] pt-5">
          <p className="text-xs uppercase tracking-wider text-[var(--color-ink-muted)] mb-3">
            Dev accounts (click to fill)
          </p>
          <ul className="space-y-1.5">
            {TEST_ACCOUNTS.map((a) => (
              <li key={a.email}>
                <button
                  type="button"
                  onClick={() => fill(a)}
                  className="w-full text-left rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-ink)] transition-colors"
                >
                  <span className="font-medium">{a.email}</span>
                  <span className="ml-2 text-[var(--color-ink-muted)]">/ {a.password}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
