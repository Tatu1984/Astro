"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

import { Button } from "@/frontend/components/ui/Button";

export function CommentComposer({ postId }: { postId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!body.trim()) return;
    setError(null);
    start(async () => {
      const res = await fetch(`/api/community/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const r = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(r?.error ?? `failed (${res.status})`);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex gap-2 items-start rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add a comment…"
        rows={2}
        maxLength={1000}
        disabled={pending}
        className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none resize-none"
      />
      <Button type="submit" variant="gold" size="sm" disabled={pending || !body.trim()}>
        <Send className="h-3.5 w-3.5" />
      </Button>
      {error ? <p className="text-xs text-[var(--color-brand-rose)]">{error}</p> : null}
    </form>
  );
}
