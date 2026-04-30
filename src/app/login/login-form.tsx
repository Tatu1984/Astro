"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFormStatus } from "react-dom";

import { Button } from "@/frontend/components/ui/shadcn/button";
import { Input } from "@/frontend/components/ui/shadcn/input";
import { Label } from "@/frontend/components/ui/shadcn/label";

import { loginAction, type LoginActionState } from "./actions";

const TEST_ACCOUNTS = [
  { email: "admin@astro.local", password: "Admin@2026!" },
  { email: "user1@astro.local", password: "User1@2026!" },
  { email: "user2@astro.local", password: "User2@2026!" },
];

const SHOW_DEV_HINTS = process.env.NEXT_PUBLIC_SHOW_DEV_HINTS === "1";

const initialState: LoginActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="default" size="lg" className="w-full" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

export function LoginForm() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/post-login";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, formAction] = useActionState(loginAction, initialState);

  function fill(e: { email: string; password: string }) {
    setEmail(e.email);
    setPassword(e.password);
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        {state.error ? (
          <p className="text-sm text-[var(--color-brand-rose)]">{state.error}</p>
        ) : null}
        <SubmitButton />
      </form>

      <p className="text-center text-sm text-[var(--color-ink-muted)]">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-[var(--color-brand-gold)] hover:underline">
          Create one
        </Link>
      </p>
      <p className="text-center text-xs text-[var(--color-ink-muted)]">
        Are you an astrologer?{" "}
        <Link href="/astrologer-signup" className="text-[var(--color-brand-gold)] hover:underline">
          Sign up here →
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
