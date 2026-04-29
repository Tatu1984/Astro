"use client";

import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface NotificationRow {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  payload: unknown;
  readAt: string | null;
  createdAt: string;
}

const POLL_MS = 60_000;

export function NotificationBell({ light = false }: { light?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread-count", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { count: number };
      setUnread(data.count);
    } catch {
      // ignore
    }
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=20", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { rows: NotificationRow[]; unread: number };
      setItems(data.rows);
      setUnread(data.unread);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnread();
    const id = window.setInterval(fetchUnread, POLL_MS);
    return () => window.clearInterval(id);
  }, [fetchUnread]);

  useEffect(() => {
    if (!open) return;
    fetchList();
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open, fetchList]);

  async function onSelect(row: NotificationRow) {
    if (!row.readAt) {
      await fetch(`/api/notifications/${row.id}/read`, { method: "POST" });
    }
    setOpen(false);
    const href = extractHref(row.payload);
    if (href) {
      router.push(href);
    } else {
      router.refresh();
    }
    fetchUnread();
  }

  async function readAll() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    setUnread(0);
    setItems((rows) => rows.map((r) => (r.readAt ? r : { ...r, readAt: new Date().toISOString() })));
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className={
          "relative inline-flex h-8 w-8 items-center justify-center rounded-md " +
          (light ? "hover:bg-black/5 text-[var(--color-ink-light)]" : "hover:bg-white/5 text-white/80")
        }
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 grid place-items-center rounded-full bg-[var(--color-brand-rose)] text-[9px] font-semibold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={
            "absolute right-0 top-10 z-50 w-80 rounded-lg border shadow-xl " +
            (light
              ? "border-[var(--color-border-light)] bg-white"
              : "border-[var(--color-border)] bg-[#1a1530]")
          }
        >
          <div
            className={
              "flex items-center justify-between px-3 py-2 border-b " +
              (light ? "border-[var(--color-border-light)]" : "border-white/10")
            }
          >
            <span className={"text-xs font-semibold " + (light ? "text-[var(--color-ink-light)]" : "text-white")}>
              Notifications
            </span>
            <button
              type="button"
              onClick={readAll}
              className={"text-[10px] uppercase tracking-wider " + (light ? "text-[var(--color-brand-violet)]" : "text-white/55 hover:text-white")}
            >
              Mark all read
            </button>
          </div>
          <div className="max-h-[420px] overflow-auto">
            {loading && items.length === 0 ? (
              <p className={"px-3 py-4 text-xs " + (light ? "text-[var(--color-ink-muted-light)]" : "text-white/55")}>Loading…</p>
            ) : items.length === 0 ? (
              <p className={"px-3 py-6 text-xs text-center " + (light ? "text-[var(--color-ink-muted-light)]" : "text-white/55")}>
                You&apos;re all caught up.
              </p>
            ) : (
              <ul className="divide-y divide-white/5">
                {items.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(row)}
                      className={
                        "w-full text-left px-3 py-2.5 transition-colors " +
                        (light ? "hover:bg-black/5" : "hover:bg-white/5")
                      }
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={
                            "mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 " +
                            (row.readAt ? "bg-transparent" : "bg-[var(--color-brand-gold)]")
                          }
                        />
                        <div className="min-w-0">
                          <p className={"text-sm font-medium " + (light ? "text-[var(--color-ink-light)]" : "text-white")}>
                            {row.title}
                          </p>
                          {row.body ? (
                            <p
                              className={
                                "text-xs mt-0.5 line-clamp-2 " +
                                (light ? "text-[var(--color-ink-muted-light)]" : "text-white/55")
                              }
                            >
                              {row.body}
                            </p>
                          ) : null}
                          <p className={"text-[10px] mt-1 " + (light ? "text-[var(--color-ink-muted-light)]" : "text-white/40")}>
                            {fmt(row.createdAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function fmt(iso: string): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function extractHref(payload: unknown): string | null {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const obj = payload as Record<string, unknown>;
    if (typeof obj.href === "string") return obj.href;
  }
  return null;
}
