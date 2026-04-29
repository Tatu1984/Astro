"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/frontend/components/ui/Button";
import { CardLight } from "@/frontend/components/ui/CardLight";
import { Input } from "@/frontend/components/ui/shadcn/input";

interface AuditLogRow {
  id: string;
  kind: string;
  resource: string;
  resourceId: string | null;
  payload: unknown;
  ip: string | null;
  createdAt: string;
  actor: { id: string; email: string | null; name: string | null; role: string } | null;
}

interface UserOption {
  id: string;
  email: string | null;
  name: string | null;
}

const PAGE_SIZE = 50;

export function AuditClient() {
  const [kindFilter, setKindFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [offset, setOffset] = useState(0);

  const [kinds, setKinds] = useState<string[]>([]);
  const [resourceTypes, setResourceTypes] = useState<string[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);

  const [data, setData] = useState<{ rows: AuditLogRow[]; total: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    void (async () => {
      try {
        const [kRes, uRes] = await Promise.all([
          fetch("/api/admin/audit/kinds", { cache: "no-store" }),
          fetch("/api/admin/users", { cache: "no-store" }),
        ]);
        if (kRes.ok) {
          const j = (await kRes.json()) as { kinds: string[]; resourceTypes: string[] };
          setKinds(j.kinds);
          setResourceTypes(j.resourceTypes);
        }
        if (uRes.ok) {
          const j = (await uRes.json()) as { users: UserOption[] };
          setUsers(j.users);
        }
      } catch {
        // non-fatal
      }
    })();
  }, []);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (kindFilter) p.set("kind", kindFilter);
    if (actorFilter) p.set("actorUserId", actorFilter);
    if (resourceFilter) p.set("resourceType", resourceFilter);
    if (fromDate) p.set("fromDate", new Date(fromDate).toISOString());
    if (toDate) p.set("toDate", new Date(toDate).toISOString());
    p.set("limit", String(PAGE_SIZE));
    p.set("offset", String(offset));
    return p.toString();
  }, [kindFilter, actorFilter, resourceFilter, fromDate, toDate, offset]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/audit?${params}`, { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `failed (${res.status})`);
      }
      const j = (await res.json()) as { rows: AuditLogRow[]; total: number };
      setData(j);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function resetFilters() {
    setKindFilter("");
    setActorFilter("");
    setResourceFilter("");
    setFromDate("");
    setToDate("");
    setOffset(0);
  }

  return (
    <div className="space-y-5">
      <CardLight>
        <h3 className="font-semibold mb-3 text-sm">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider text-[var(--color-ink-muted-light)]">Kind</label>
            <select
              value={kindFilter}
              onChange={(e) => {
                setKindFilter(e.target.value);
                setOffset(0);
              }}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">All kinds</option>
              {kinds.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider text-[var(--color-ink-muted-light)]">Resource</label>
            <select
              value={resourceFilter}
              onChange={(e) => {
                setResourceFilter(e.target.value);
                setOffset(0);
              }}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">All resources</option>
              {resourceTypes.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider text-[var(--color-ink-muted-light)]">Actor</label>
            <select
              value={actorFilter}
              onChange={(e) => {
                setActorFilter(e.target.value);
                setOffset(0);
              }}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">Any actor</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email ?? u.name ?? u.id}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider text-[var(--color-ink-muted-light)]">From</label>
            <Input
              type="datetime-local"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setOffset(0);
              }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider text-[var(--color-ink-muted-light)]">To</label>
            <Input
              type="datetime-local"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setOffset(0);
              }}
            />
          </div>
        </div>
        <div className="flex justify-end mt-3">
          <Button variant="outline" size="sm" onClick={resetFilters}>
            Reset
          </Button>
        </div>
      </CardLight>

      {err ? (
        <CardLight className="border-[var(--color-brand-rose)]/40">
          <p className="text-sm text-[var(--color-brand-rose)]">{err}</p>
        </CardLight>
      ) : null}

      <CardLight className="!p-0 overflow-hidden">
        {loading && !data ? (
          <div className="p-8 text-sm text-center text-[var(--color-ink-muted-light)]">Loading…</div>
        ) : !data || !data.rows.length ? (
          <div className="p-8 text-sm text-center text-[var(--color-ink-muted-light)]">
            No matching audit logs.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-2-light)] text-left text-xs uppercase tracking-wider text-[var(--color-ink-muted-light)]">
              <tr>
                <th className="px-3 py-3 font-medium w-8" />
                <th className="px-3 py-3 font-medium">When</th>
                <th className="px-3 py-3 font-medium">Kind</th>
                <th className="px-3 py-3 font-medium">Resource</th>
                <th className="px-3 py-3 font-medium">Actor</th>
                <th className="px-3 py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => {
                const isOpen = expanded.has(r.id);
                return (
                  <Fragment key={r.id}>
                    <tr
                      className="border-t border-[var(--color-border-light)] cursor-pointer hover:bg-[var(--color-surface-2-light)]/50"
                      onClick={() => toggleExpand(r.id)}
                    >
                      <td className="px-3 py-3 text-[var(--color-ink-muted-light)]">{isOpen ? "▾" : "▸"}</td>
                      <td className="px-3 py-3 text-[var(--color-ink-muted-light)] whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleString("en-GB", {
                          year: "2-digit",
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="px-3 py-3 font-medium">{r.kind}</td>
                      <td className="px-3 py-3 text-[var(--color-ink-muted-light)]">
                        {r.resource}
                        {r.resourceId ? (
                          <span className="ml-1 text-[11px] font-mono">#{r.resourceId.slice(0, 8)}</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-[var(--color-ink-muted-light)]">
                        {r.actor ? (r.actor.email ?? r.actor.name ?? r.actor.id) : "system"}
                      </td>
                      <td className="px-3 py-3 text-[var(--color-ink-muted-light)] font-mono text-xs">
                        {r.ip ?? "—"}
                      </td>
                    </tr>
                    {isOpen ? (
                      <tr className="border-t border-[var(--color-border-light)] bg-[var(--color-surface-2-light)]/30">
                        <td colSpan={6} className="px-6 py-3">
                          <pre className="text-xs whitespace-pre-wrap break-words font-mono bg-[var(--color-surface-2-light)] p-3 rounded">
                            {r.payload != null ? JSON.stringify(r.payload, null, 2) : "(empty)"}
                          </pre>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
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
    </div>
  );
}
