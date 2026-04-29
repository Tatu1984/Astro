"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/frontend/components/ui/Button";
import { CardLight } from "@/frontend/components/ui/CardLight";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/frontend/components/ui/shadcn/dialog";
import { Textarea } from "@/frontend/components/ui/shadcn/textarea";

type Tab = "POSTS" | "COMMENTS" | "USERS";

interface PostRow {
  id: string;
  body: string;
  visibility: string;
  hiddenAt: string | null;
  hiddenByUserId: string | null;
  deletedAt: string | null;
  createdAt: string;
  user: { id: string; email: string | null; name: string | null };
  hiddenBy: { id: string; email: string | null; name: string | null } | null;
  _count: { comments: number; reactions: number };
}

interface CommentRow {
  id: string;
  body: string;
  hiddenAt: string | null;
  hiddenByUserId: string | null;
  deletedAt: string | null;
  createdAt: string;
  user: { id: string; email: string | null; name: string | null };
  hiddenBy: { id: string; email: string | null; name: string | null } | null;
  post: { id: string; body: string };
}

interface UserRow {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
  bannedUntil: string | null;
  createdAt: string;
}

type ContentAction = "HIDE" | "DELETE" | "RESTORE";
type UserAction = "BAN_24H" | "BAN_PERM" | "UNBAN";

const TABS: { id: Tab; label: string }[] = [
  { id: "POSTS", label: "Posts" },
  { id: "COMMENTS", label: "Comments" },
  { id: "USERS", label: "Users" },
];

const PAGE_SIZE = 25;

export function ModerationClient() {
  const [tab, setTab] = useState<Tab>("POSTS");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<{
    rows: PostRow[] | CommentRow[] | UserRow[];
    total: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [pendingAction, setPendingAction] = useState<{
    targetType: Tab;
    targetId: string;
    action: ContentAction | UserAction;
    label: string;
  } | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionErr, setActionErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/admin/moderation/queue?kind=${tab}&limit=${PAGE_SIZE}&offset=${offset}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `failed (${res.status})`);
      }
      const j = (await res.json()) as { rows: PostRow[] | CommentRow[] | UserRow[]; total: number };
      setData({ rows: j.rows, total: j.total });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, [tab, offset]);

  useEffect(() => {
    void load();
  }, [load]);

  function openDialog(targetType: Tab, targetId: string, action: ContentAction | UserAction) {
    setPendingAction({
      targetType,
      targetId,
      action,
      label: actionLabel(action),
    });
    setReason("");
    setActionErr(null);
  }

  async function confirmAction() {
    if (!pendingAction) return;
    setSubmitting(true);
    setActionErr(null);
    try {
      const path =
        pendingAction.targetType === "POSTS"
          ? `/api/admin/moderation/posts/${pendingAction.targetId}`
          : pendingAction.targetType === "COMMENTS"
            ? `/api/admin/moderation/comments/${pendingAction.targetId}`
            : `/api/admin/moderation/users/${pendingAction.targetId}`;
      const res = await fetch(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: pendingAction.action, reason: reason || undefined }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `failed (${res.status})`);
      }
      setPendingAction(null);
      await load();
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : "action failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 border-b border-[var(--color-border-light)]">
        {TABS.map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => {
              setTab(t.id);
              setOffset(0);
            }}
            className={
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors " +
              (tab === t.id
                ? "border-[var(--color-brand-violet)] text-[var(--color-brand-violet)]"
                : "border-transparent text-[var(--color-ink-muted-light)] hover:text-[var(--color-ink-light)]")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {err ? (
        <CardLight className="border-[var(--color-brand-rose)]/40">
          <p className="text-sm text-[var(--color-brand-rose)]">{err}</p>
        </CardLight>
      ) : null}

      <CardLight className="!p-0 overflow-hidden">
        {loading && !data ? (
          <div className="p-8 text-sm text-center text-[var(--color-ink-muted-light)]">Loading…</div>
        ) : tab === "POSTS" ? (
          <PostsTable rows={(data?.rows as PostRow[]) ?? []} onAct={(id, a) => openDialog("POSTS", id, a)} />
        ) : tab === "COMMENTS" ? (
          <CommentsTable
            rows={(data?.rows as CommentRow[]) ?? []}
            onAct={(id, a) => openDialog("COMMENTS", id, a)}
          />
        ) : (
          <UsersTable rows={(data?.rows as UserRow[]) ?? []} onAct={(id, a) => openDialog("USERS", id, a)} />
        )}
      </CardLight>

      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--color-ink-muted-light)]">
          {data ? `${offset + 1}–${Math.min(offset + PAGE_SIZE, data.total)} of ${data.total}` : "—"}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={offset === 0 || loading}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={loading || !data || offset + PAGE_SIZE >= data.total}
            onClick={() => setOffset(offset + PAGE_SIZE)}
          >
            Next
          </Button>
        </div>
      </div>

      <Dialog open={!!pendingAction} onOpenChange={(o) => !o && setPendingAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm {pendingAction?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Optional reason — recorded in moderation log + audit log.
            </p>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. spam, harassment, off-topic"
              maxLength={500}
            />
            {actionErr ? <p className="text-sm text-[var(--color-brand-rose)]">{actionErr}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPendingAction(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant={pendingAction?.action === "RESTORE" || pendingAction?.action === "UNBAN" ? "primary" : "destructive"}
              size="sm"
              onClick={confirmAction}
              disabled={submitting}
            >
              {submitting ? "Working…" : `Confirm ${pendingAction?.label}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function actionLabel(action: ContentAction | UserAction): string {
  switch (action) {
    case "HIDE":
      return "hide";
    case "DELETE":
      return "delete";
    case "RESTORE":
      return "restore";
    case "BAN_24H":
      return "ban 24h";
    case "BAN_PERM":
      return "permanent ban";
    case "UNBAN":
      return "unban";
  }
}

function fmtDt(s: string): string {
  return new Date(s).toLocaleString("en-GB", {
    year: "2-digit",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ row }: { row: PostRow | CommentRow }) {
  if (row.deletedAt) {
    return (
      <span className="inline-block rounded-md border border-[var(--color-brand-rose)]/40 bg-[var(--color-brand-rose)]/10 text-[#a13333] px-2 py-0.5 text-xs">
        DELETED
      </span>
    );
  }
  if (row.hiddenAt) {
    return (
      <span className="inline-block rounded-md border border-[var(--color-brand-gold)]/40 bg-[var(--color-brand-gold)]/15 text-[#a17800] px-2 py-0.5 text-xs">
        HIDDEN
      </span>
    );
  }
  return (
    <span className="inline-block rounded-md border border-[var(--color-brand-aqua)]/40 bg-[var(--color-brand-aqua)]/10 text-[#0a8273] px-2 py-0.5 text-xs">
      ACTIVE
    </span>
  );
}

function UserStatusBadge({ row }: { row: UserRow }) {
  const banned = row.bannedUntil && new Date(row.bannedUntil).getTime() > Date.now();
  if (!banned) {
    return (
      <span className="inline-block rounded-md border border-[var(--color-brand-aqua)]/40 bg-[var(--color-brand-aqua)]/10 text-[#0a8273] px-2 py-0.5 text-xs">
        ACTIVE
      </span>
    );
  }
  const dt = new Date(row.bannedUntil!);
  const isPerm = dt.getUTCFullYear() >= 9999;
  return (
    <span className="inline-block rounded-md border border-[var(--color-brand-rose)]/40 bg-[var(--color-brand-rose)]/10 text-[#a13333] px-2 py-0.5 text-xs">
      {isPerm ? "BANNED · PERM" : `BANNED · until ${fmtDt(row.bannedUntil!)}`}
    </span>
  );
}

function PostsTable({ rows, onAct }: { rows: PostRow[]; onAct: (id: string, a: ContentAction) => void }) {
  if (!rows.length) return <Empty />;
  return (
    <table className="w-full text-sm">
      <thead className="bg-[var(--color-surface-2-light)] text-left text-xs uppercase tracking-wider text-[var(--color-ink-muted-light)]">
        <tr>
          <th className="px-4 py-3 font-medium">Post</th>
          <th className="px-4 py-3 font-medium">Author</th>
          <th className="px-4 py-3 font-medium">Status</th>
          <th className="px-4 py-3 font-medium">Created</th>
          <th className="px-4 py-3 font-medium text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-t border-[var(--color-border-light)] align-top">
            <td className="px-4 py-3 max-w-md">
              <div className="line-clamp-3 whitespace-pre-wrap">{r.body}</div>
              <div className="text-[11px] text-[var(--color-ink-muted-light)] mt-1">
                {r._count.comments} comments · {r._count.reactions} reactions
              </div>
            </td>
            <td className="px-4 py-3 text-[var(--color-ink-muted-light)]">{r.user.email ?? r.user.name ?? r.user.id}</td>
            <td className="px-4 py-3">
              <StatusBadge row={r} />
            </td>
            <td className="px-4 py-3 text-[var(--color-ink-muted-light)] whitespace-nowrap">{fmtDt(r.createdAt)}</td>
            <td className="px-4 py-3 text-right space-x-1">
              {!r.hiddenAt && !r.deletedAt ? (
                <Button variant="outline" size="sm" onClick={() => onAct(r.id, "HIDE")}>
                  Hide
                </Button>
              ) : null}
              {!r.deletedAt ? (
                <Button variant="destructive" size="sm" onClick={() => onAct(r.id, "DELETE")}>
                  Delete
                </Button>
              ) : null}
              {r.hiddenAt || r.deletedAt ? (
                <Button variant="primary" size="sm" onClick={() => onAct(r.id, "RESTORE")}>
                  Restore
                </Button>
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CommentsTable({
  rows,
  onAct,
}: {
  rows: CommentRow[];
  onAct: (id: string, a: ContentAction) => void;
}) {
  if (!rows.length) return <Empty />;
  return (
    <table className="w-full text-sm">
      <thead className="bg-[var(--color-surface-2-light)] text-left text-xs uppercase tracking-wider text-[var(--color-ink-muted-light)]">
        <tr>
          <th className="px-4 py-3 font-medium">Comment</th>
          <th className="px-4 py-3 font-medium">Author</th>
          <th className="px-4 py-3 font-medium">Status</th>
          <th className="px-4 py-3 font-medium">Created</th>
          <th className="px-4 py-3 font-medium text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-t border-[var(--color-border-light)] align-top">
            <td className="px-4 py-3 max-w-md">
              <div className="line-clamp-3 whitespace-pre-wrap">{r.body}</div>
              <div className="text-[11px] text-[var(--color-ink-muted-light)] mt-1">
                on post: <span className="line-clamp-1 italic">{r.post.body.slice(0, 80)}</span>
              </div>
            </td>
            <td className="px-4 py-3 text-[var(--color-ink-muted-light)]">{r.user.email ?? r.user.name ?? r.user.id}</td>
            <td className="px-4 py-3">
              <StatusBadge row={r} />
            </td>
            <td className="px-4 py-3 text-[var(--color-ink-muted-light)] whitespace-nowrap">{fmtDt(r.createdAt)}</td>
            <td className="px-4 py-3 text-right space-x-1">
              {!r.hiddenAt && !r.deletedAt ? (
                <Button variant="outline" size="sm" onClick={() => onAct(r.id, "HIDE")}>
                  Hide
                </Button>
              ) : null}
              {!r.deletedAt ? (
                <Button variant="destructive" size="sm" onClick={() => onAct(r.id, "DELETE")}>
                  Delete
                </Button>
              ) : null}
              {r.hiddenAt || r.deletedAt ? (
                <Button variant="primary" size="sm" onClick={() => onAct(r.id, "RESTORE")}>
                  Restore
                </Button>
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function UsersTable({ rows, onAct }: { rows: UserRow[]; onAct: (id: string, a: UserAction) => void }) {
  if (!rows.length) return <Empty hint="No banned users in the last 30 days." />;
  return (
    <table className="w-full text-sm">
      <thead className="bg-[var(--color-surface-2-light)] text-left text-xs uppercase tracking-wider text-[var(--color-ink-muted-light)]">
        <tr>
          <th className="px-4 py-3 font-medium">Email</th>
          <th className="px-4 py-3 font-medium">Name</th>
          <th className="px-4 py-3 font-medium">Role</th>
          <th className="px-4 py-3 font-medium">Status</th>
          <th className="px-4 py-3 font-medium text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((u) => {
          const banned = u.bannedUntil && new Date(u.bannedUntil).getTime() > Date.now();
          return (
            <tr key={u.id} className="border-t border-[var(--color-border-light)] align-middle">
              <td className="px-4 py-3 font-medium">{u.email ?? "—"}</td>
              <td className="px-4 py-3 text-[var(--color-ink-muted-light)]">{u.name ?? "—"}</td>
              <td className="px-4 py-3 text-xs text-[var(--color-ink-muted-light)]">{u.role}</td>
              <td className="px-4 py-3">
                <UserStatusBadge row={u} />
              </td>
              <td className="px-4 py-3 text-right space-x-1">
                {!banned ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => onAct(u.id, "BAN_24H")}>
                      Ban 24h
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => onAct(u.id, "BAN_PERM")}>
                      Ban perm
                    </Button>
                  </>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => onAct(u.id, "UNBAN")}>
                    Unban
                  </Button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Empty({ hint }: { hint?: string }) {
  return (
    <div className="p-8 text-sm text-center text-[var(--color-ink-muted-light)]">
      {hint ?? "No items."}
    </div>
  );
}
