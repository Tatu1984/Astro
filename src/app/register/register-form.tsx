"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import { Button } from "@/frontend/components/ui/shadcn/button";
import { Input } from "@/frontend/components/ui/shadcn/input";
import { Label } from "@/frontend/components/ui/shadcn/label";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name: name || undefined }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Could not create account.");
      setSubmitting(false);
      return;
    }

    // Auto-login right after signup.
    const signin = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setSubmitting(false);

    if (signin?.error) {
      // Account was created but auto-login failed; route to /login instead.
      router.replace("/login");
      return;
    }

    router.replace("/post-login");
    router.refresh();
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name (optional)</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            disabled={submitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
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
            minLength={8}
            autoComplete="new-password"
            disabled={submitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
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
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-sm text-[var(--color-ink-muted)]">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--color-brand-gold)] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
