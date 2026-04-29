"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/frontend/components/ui/Button";
import { CardLight } from "@/frontend/components/ui/CardLight";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/frontend/components/ui/shadcn/dialog";
import { Input } from "@/frontend/components/ui/shadcn/input";
import { Label } from "@/frontend/components/ui/shadcn/label";
import { Textarea } from "@/frontend/components/ui/shadcn/textarea";

interface Flag {
  id: string;
  key: string;
  description: string | null;
  enabled: boolean;
  rolloutPct: number;
  createdAt: string;
  updatedAt: string;
}

export function FlagsClient() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [openAdd, setOpenAdd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/flags", { cache: "no-store" });
      if (!res.ok) throw new Error(`failed (${res.status})`);
      const j = (await res.json()) as { flags: Flag[] };
      setFlags(j.flags);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-ink-muted-light)]">
          Boolean toggles with optional rollout percentage. Bucket is a SHA-256 hash of <code>key:userId</code>.
        </p>
        <Button variant="primary" size="sm" onClick={() => setOpenAdd(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add flag
        </Button>
      </div>

      {err ? (
        <CardLight className="border-[var(--color-brand-rose)]/40">
          <p className="text-sm text-[var(--color-brand-rose)]">{err}</p>
        </CardLight>
      ) : null}

      <CardLight className="!p-0 overflow-hidden">
        {loading && !flags.length ? (
          <div className="p-8 text-sm text-center text-[var(--color-ink-muted-light)]">Loading…</div>
        ) : !flags.length ? (
          <div className="p-8 text-sm text-center text-[var(--color-ink-muted-light)]">
            No flags yet. Add one above.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-2-light)] text-left text-xs uppercase tracking-wider text-[var(--color-ink-muted-light)]">
              <tr>
                <th className="px-4 py-3 font-medium">Key</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium w-24">Enabled</th>
                <th className="px-4 py-3 font-medium w-32">Rollout %</th>
                <th className="px-4 py-3 font-medium text-right w-20" />
              </tr>
            </thead>
            <tbody>
              {flags.map((f) => (
                <FlagRow key={f.id} flag={f} onChanged={load} />
              ))}
            </tbody>
          </table>
        )}
      </CardLight>

      <AddFlagDialog open={openAdd} onOpenChange={setOpenAdd} onCreated={load} />
    </div>
  );
}

function FlagRow({ flag, onChanged }: { flag: Flag; onChanged: () => Promise<void> }) {
  const [enabled, setEnabled] = useState(flag.enabled);
  const [rolloutPct, setRolloutPct] = useState(flag.rolloutPct);
  const [description, setDescription] = useState(flag.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    enabled !== flag.enabled ||
    rolloutPct !== flag.rolloutPct ||
    description !== (flag.description ?? "");

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/flags/${flag.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          rolloutPct,
          description: description || null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `failed (${res.status})`);
      }
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete flag '${flag.key}'? This cannot be undone.`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/flags/${flag.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `failed (${res.status})`);
      }
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "delete failed");
      setSaving(false);
    }
  }

  return (
    <tr className="border-t border-[var(--color-border-light)] align-top">
      <td className="px-4 py-3 font-mono text-xs">
        {flag.key}
        {error ? <div className="text-[11px] text-[var(--color-brand-rose)] mt-1">{error}</div> : null}
      </td>
      <td className="px-4 py-3">
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="(optional)"
          disabled={saving}
          className="h-8 text-xs"
        />
      </td>
      <td className="px-4 py-3">
        <label className="inline-flex items-center cursor-pointer gap-2">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            disabled={saving}
            className="h-4 w-4"
          />
          <span className="text-xs">{enabled ? "on" : "off"}</span>
        </label>
      </td>
      <td className="px-4 py-3">
        <Input
          type="number"
          min={0}
          max={100}
          value={rolloutPct}
          onChange={(e) => setRolloutPct(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
          disabled={saving}
          className="h-8 text-xs w-20"
        />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-1">
          {dirty ? (
            <Button variant="primary" size="sm" onClick={save} disabled={saving}>
              {saving ? "…" : "Save"}
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={remove} disabled={saving} title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function AddFlagDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => Promise<void>;
}) {
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [rolloutPct, setRolloutPct] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function reset() {
    setKey("");
    setDescription("");
    setEnabled(false);
    setRolloutPct(0);
    setErr(null);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          description: description || undefined,
          enabled,
          rolloutPct,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `failed (${res.status})`);
      }
      reset();
      onOpenChange(false);
      await onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "create failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add feature flag</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <Label>Key *</Label>
            <Input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              required
              placeholder="e.g. composite_charts"
              maxLength={80}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Enabled by default</Label>
              <label className="inline-flex items-center cursor-pointer gap-2">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-xs">{enabled ? "on" : "off"}</span>
              </label>
            </div>
            <div className="space-y-1.5">
              <Label>Rollout %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={rolloutPct}
                onChange={(e) => setRolloutPct(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
              />
            </div>
          </div>
          {err ? <p className="text-sm text-[var(--color-brand-rose)]">{err}</p> : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={submitting}>
              {submitting ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
