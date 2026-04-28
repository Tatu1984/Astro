import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";

import { auth } from "@/auth";
import { listPublicPosts } from "@/backend/services/community.service";
import { TopBar } from "@/frontend/components/portal/TopBar";
import { Card } from "@/frontend/components/ui/Card";

import { DeletePostButton, ReactionRow } from "./post-actions";
import { PostComposer } from "./post-composer";

export const dynamic = "force-dynamic";

const RELATIVE = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
function fmtRelative(d: Date): string {
  const diffMin = (d.getTime() - Date.now()) / 60000;
  const abs = Math.abs(diffMin);
  if (abs < 1) return "just now";
  if (abs < 60) return RELATIVE.format(Math.round(diffMin), "minute");
  if (abs < 60 * 24) return RELATIVE.format(Math.round(diffMin / 60), "hour");
  return RELATIVE.format(Math.round(diffMin / (60 * 24)), "day");
}

function authorInitials(name: string | null, email: string | null): string {
  const base = (name ?? email ?? "U").trim();
  if (base === "Anonymous") return "A";
  const parts = base.split(/\s+/);
  return ((parts[0]?.[0] ?? "U") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default async function CommunityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const posts = await listPublicPosts(session.user.id);

  return (
    <>
      <TopBar
        title="Community"
        subtitle="Public + anonymous posts · last 50"
      />
      <div className="p-6 space-y-5 max-w-2xl">
        <PostComposer />

        {posts.length === 0 ? (
          <Card className="!p-8 text-center">
            <p className="text-sm text-white/55">Be the first to post — share something about your chart.</p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {posts.map((p) => (
              <li key={p.id}>
                <article className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3">
                  <header className="flex items-center gap-3">
                    <span className="grid place-items-center h-8 w-8 rounded-full bg-[var(--color-brand-violet)]/20 text-[10px] font-semibold tracking-wider text-[var(--color-brand-violet)]">
                      {authorInitials(p.author.name, p.author.email)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{p.author.name ?? "User"}</div>
                      <div className="text-[10px] text-white/40">{fmtRelative(p.createdAt)}</div>
                    </div>
                    {p.visibility === "ANONYMOUS" ? (
                      <span className="rounded-md border border-[var(--color-border)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/40">
                        Anon
                      </span>
                    ) : null}
                    {p.isOwn ? <DeletePostButton postId={p.id} /> : null}
                  </header>
                  <p className="text-sm text-white/85 whitespace-pre-wrap leading-relaxed">{p.body}</p>
                  <div className="flex items-center justify-between">
                    <ReactionRow postId={p.id} counts={p.reactionCounts} myReactions={p.myReactions} />
                    <Link
                      href={`/user/community/${p.id}`}
                      className="inline-flex items-center gap-1 text-xs text-white/55 hover:text-white"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      {p.commentCount} {p.commentCount === 1 ? "comment" : "comments"}
                    </Link>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
