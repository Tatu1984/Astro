import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/auth";
import { getPostWithComments } from "@/backend/services/community.service";
import { TopBar } from "@/frontend/components/portal/TopBar";

import { CommentComposer } from "../comment-composer";
import { DeletePostButton, ReactionRow } from "../post-actions";

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

function initials(name: string | null, email: string | null): string {
  const base = (name ?? email ?? "U").trim();
  if (base === "Anonymous") return "A";
  const parts = base.split(/\s+/);
  return ((parts[0]?.[0] ?? "U") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  let post;
  try {
    post = await getPostWithComments(session.user.id, id);
  } catch {
    redirect("/user/community");
  }

  return (
    <>
      <TopBar title={`Post by ${post.author.name ?? "User"}`} subtitle={fmtRelative(post.createdAt)} />
      <div className="p-6 space-y-4 max-w-2xl">
        <Link href="/user/community" className="inline-flex items-center gap-1.5 text-xs text-white/55 hover:text-white">
          <ArrowLeft className="h-3 w-3" /> Back to feed
        </Link>

        <article className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-3">
          <header className="flex items-center gap-3">
            <span className="grid place-items-center h-9 w-9 rounded-full bg-[var(--color-brand-violet)]/20 text-xs font-semibold text-[var(--color-brand-violet)]">
              {initials(post.author.name, post.author.email)}
            </span>
            <div className="flex-1">
              <div className="text-sm text-white">{post.author.name ?? "User"}</div>
              <div className="text-[10px] text-white/40">{fmtRelative(post.createdAt)}</div>
            </div>
            {post.visibility === "ANONYMOUS" ? (
              <span className="rounded-md border border-[var(--color-border)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/40">
                Anon
              </span>
            ) : null}
            {post.isOwn ? <DeletePostButton postId={post.id} /> : null}
          </header>
          <p className="text-base text-white/90 whitespace-pre-wrap leading-relaxed">{post.body}</p>
          <ReactionRow postId={post.id} counts={post.reactionCounts} myReactions={post.myReactions} />
        </article>

        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-wider text-white/45">
            {post.comments.length} {post.comments.length === 1 ? "comment" : "comments"}
          </h2>
          <CommentComposer postId={post.id} />
          {post.comments.length > 0 ? (
            <ul className="space-y-2">
              {post.comments.map((c) => (
                <li
                  key={c.id}
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-3 space-y-1"
                >
                  <div className="flex items-center gap-2 text-xs">
                    <span className="grid place-items-center h-6 w-6 rounded-full bg-[var(--color-brand-aqua)]/20 text-[9px] font-semibold text-[var(--color-brand-aqua)]">
                      {initials(c.author.name, c.author.email)}
                    </span>
                    <span className="text-white/80">{c.author.name ?? "User"}</span>
                    <span className="text-white/40">·</span>
                    <span className="text-white/40">{fmtRelative(c.createdAt)}</span>
                  </div>
                  <p className="text-sm text-white/85 whitespace-pre-wrap">{c.body}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>
    </>
  );
}
