"use client";

import { use, useEffect, useState } from "react";

import { TopBar } from "@/frontend/components/portal/TopBar";
import { Button } from "@/frontend/components/ui/Button";
import { Card } from "@/frontend/components/ui/Card";

type StartResp = { roomUrl: string; roomName: string; token: string };
type Template = { id: string; title: string; body: string };

export default function AstrologerSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [session, setSession] = useState<StartResp | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/astrologer/bookings/${id}/start`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? "failed to start");
      setSession(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to start");
    } finally {
      setLoading(false);
    }
  }

  async function complete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/astrologer/bookings/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "failed to complete");
      setCompleted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to complete");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!session) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/astrologer/templates", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { own: Template[]; shared: Template[] } | null) => {
        if (cancelled || !data) return;
        setTemplates([...(data.own ?? []), ...(data.shared ?? [])]);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  function insertTemplate(templateId: string) {
    if (!templateId) return;
    const t = templates.find((x) => x.id === templateId);
    if (!t) return;
    setNotes((prev) => (prev ? `${t.body}\n\n${prev}` : t.body));
  }

  const isStub = session?.roomUrl?.startsWith("stub://");
  const iframeSrc = session && !isStub
    ? `${session.roomUrl}?t=${encodeURIComponent(session.token)}`
    : null;

  return (
    <>
      <TopBar title="Live Session" subtitle={`Booking ${id}`} />
      <div className="p-6 grid lg:grid-cols-[1fr_360px] gap-6">
        <Card className="!p-0 min-h-[480px] overflow-hidden">
          {error ? (
            <div className="p-6 text-sm text-[var(--color-brand-rose)]">{error}</div>
          ) : !session ? (
            <div className="p-6 text-sm text-white/60">Starting session…</div>
          ) : iframeSrc ? (
            <iframe
              src={iframeSrc}
              allow="camera; microphone; fullscreen; speaker; display-capture"
              className="w-full h-[640px] border-0"
            />
          ) : (
            <div className="p-6 text-sm text-white/60">
              <p className="mb-2 font-medium">Stub mode (no DAILY_API_KEY)</p>
              <p className="text-xs">Room URL: <code>{session.roomUrl}</code></p>
              <p className="text-xs">Token: <code>{session.token}</code></p>
            </div>
          )}
        </Card>
        <Card className="!p-4 flex flex-col gap-3">
          <h3 className="font-semibold text-[var(--color-brand-gold)]">Session notes</h3>
          {templates.length > 0 ? (
            <select
              value=""
              onChange={(e) => insertTemplate(e.target.value)}
              disabled={completed}
              className="w-full rounded-md border border-[var(--color-border)] bg-white/5 px-3 py-2 text-xs text-white"
            >
              <option value="" className="bg-[#1a1530]">
                Insert template…
              </option>
              {templates.map((t) => (
                <option key={t.id} value={t.id} className="bg-[#1a1530]">
                  {t.title}
                </option>
              ))}
            </select>
          ) : null}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={completed}
            className="w-full min-h-[260px] rounded-md bg-white/5 border border-[var(--color-border)] p-3 text-sm text-white/85"
            placeholder="Notes for this consult — visible only to you."
          />
          {completed ? (
            <p className="text-sm text-[var(--color-brand-aqua)]">Session completed and earnings credited.</p>
          ) : (
            <Button onClick={complete} disabled={loading}>
              {loading ? "Completing…" : "Complete Session"}
            </Button>
          )}
        </Card>
      </div>
    </>
  );
}
