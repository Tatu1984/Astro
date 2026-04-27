import { Suspense } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Aurora, StarField } from "@/frontend/components/effects/Aurora";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/user");

  return (
    <main className="relative min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)] overflow-hidden">
      <Aurora />
      <StarField />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur p-8 shadow-xl">
          <div className="mb-7 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="mt-1.5 text-sm text-[var(--color-ink-muted)]">
              Astrology platform · dev preview
            </p>
          </div>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
