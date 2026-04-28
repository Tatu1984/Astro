"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flame, Heart, Star, Trash2 } from "lucide-react";

const ICONS: Record<string, React.ReactNode> = {
  like: <Heart className="h-3.5 w-3.5" />,
  star: <Star className="h-3.5 w-3.5" />,
  fire: <Flame className="h-3.5 w-3.5" />,
};

export function ReactionRow({
  postId,
  counts,
  myReactions,
}: {
  postId: string;
  counts: Record<string, number>;
  myReactions: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function toggle(type: string) {
    start(async () => {
      const res = await fetch(`/api/community/posts/${postId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1.5 text-xs">
      {(["like", "star", "fire"] as const).map((t) => {
        const active = myReactions.includes(t);
        const n = counts[t] ?? 0;
        return (
          <button
            key={t}
            type="button"
            onClick={() => toggle(t)}
            disabled={pending}
            className={
              active
                ? "inline-flex items-center gap-1 rounded-full border border-[var(--color-brand-gold)]/40 bg-[var(--color-brand-gold)]/15 text-[var(--color-brand-gold)] px-2 h-7"
                : "inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] text-white/55 hover:text-white hover:bg-white/5 px-2 h-7"
            }
            title={t}
          >
            {ICONS[t]}
            <span className="tabular-nums">{n}</span>
          </button>
        );
      })}
    </div>
  );
}

export function DeletePostButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onClick() {
    if (!confirm("Delete this post?")) return;
    start(async () => {
      const res = await fetch(`/api/community/posts/${postId}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-[var(--color-brand-rose)]"
      title="Delete post"
    >
      <Trash2 className="h-3 w-3" /> {pending ? "…" : "Delete"}
    </button>
  );
}
