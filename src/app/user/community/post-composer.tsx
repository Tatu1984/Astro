"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Send } from "lucide-react";

import { Button } from "@/frontend/components/ui/Button";

export function PostComposer() {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [anon, setAnon] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!body.trim()) return;
    setError(null);
    start(async () => {
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, visibility: anon ? "ANONYMOUS" : "PUBLIC" }),
      });
      if (!res.ok) {
        const r = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(r?.error ?? `failed (${res.status})`);
        return;
      }
      setBody("");
      setAnon(false);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3"
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share an insight, ask a question, swap notes…"
        rows={3}
        maxLength={4000}
        disabled={pending}
        className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-violet)] resize-none"
      />
      {error ? <p className="text-xs text-[var(--color-brand-rose)]">{error}</p> : null}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setAnon((v) => !v)}
          className="inline-flex items-center gap-1.5 text-xs text-white/55 hover:text-white"
        >
          {anon ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {anon ? "Posting anonymously" : "Posting as yourself"}
        </button>
        <Button type="submit" variant="gold" size="sm" disabled={pending || !body.trim()}>
          <Send className="h-3.5 w-3.5" />
          {pending ? "Posting…" : "Post"}
        </Button>
      </div>
    </form>
  );
}
