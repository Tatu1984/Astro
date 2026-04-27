"use client";
import { ChartWheel } from "@/frontend/components/astro/ChartWheel";
import { Card } from "@/frontend/components/ui/Card";
import { Button } from "@/frontend/components/ui/Button";
import { Badge } from "@/frontend/components/ui/Badge";
import { TopBar } from "@/frontend/components/portal/TopBar";
import { TextType } from "@/frontend/components/effects/TextType";
import { Mic, Video, Paperclip, Sparkles, Send } from "lucide-react";
import { useState, useEffect, useRef } from "react";

type Msg = { id: number; role: "user" | "ai"; text: string };

const SEED: Msg[] = [
  { id: 1, role: "user", text: "I'm thinking of switching from finance to product." },
  { id: 2, role: "ai",   text: "Looking at your D10 (career chart), Saturn-Mercury dasha favours analytical roles with creative leverage. Your 12H Mercury hints at a tech-product fit." },
  { id: 3, role: "user", text: "When should I make the move?" },
  { id: 4, role: "ai",   text: "Window opens 12 May 2026 with Jupiter conj your Sun. Hold until then — patience pays here." },
];

export default function LiveSession() {
  const [msgs, setMsgs] = useState<Msg[]>(SEED);
  const [input, setInput] = useState("");
  const [elapsed, setElapsed] = useState(12 * 60 + 34);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const send = (text: string) => {
    if (!text.trim()) return;
    setMsgs((m) => [...m, { id: Date.now(), role: "user", text }]);
    setInput("");
    setTimeout(() => {
      setMsgs((m) => [...m, {
        id: Date.now() + 1,
        role: "ai",
        text: "Reading your transits — Jupiter conj your Sun within 16 days, ideal for visibility moves. Saturn 10H gives the structure to land it.",
      }]);
    }, 600);
  };

  return (
    <>
      <TopBar
        title="Session · Maya × Pandit Verma"
        subtitle={`Live · ${fmt(elapsed)}`}
        right={<Button variant="destructive" size="sm">End session</Button>}
      />
      <div className="p-6 grid lg:grid-cols-[340px_1fr] gap-6 h-[calc(100dvh-3.5rem)] overflow-hidden">
        {/* client mini-chart */}
        <Card accent="gold" className="overflow-y-auto">
          <div className="grid place-items-center">
            <ChartWheel size={220} />
          </div>
          <h3 className="mt-4 font-semibold text-white">Maya Sharma · 30 · Mumbai</h3>
          <p className="text-xs text-white/55 mt-1">Born 14 Jul 1995 · 04:32 IST</p>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-white/55">Topic</span><span className="text-[var(--color-brand-gold)]">Career change</span></div>
            <div className="flex justify-between"><span className="text-white/55">Plan</span><span className="text-white/85">Pro · 30 min · ₹600</span></div>
            <div className="flex justify-between"><span className="text-white/55">Asc</span><span className="text-white/85">Cancer · Whole sign</span></div>
            <div className="flex justify-between"><span className="text-white/55">Dasha</span><span className="text-white/85">Sat / Mer</span></div>
          </div>
          <div className="mt-4 flex gap-2">
            <Badge tone="violet">D1</Badge><Badge tone="muted">D9</Badge><Badge tone="muted">D10</Badge>
          </div>
        </Card>

        {/* chat & controls */}
        <div className="flex flex-col bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
          {/* mode toggles */}
          <div className="flex items-center gap-2 p-3 border-b border-[var(--color-border)]">
            <Button size="sm" variant="primary"><Mic className="h-4 w-4" /> Voice</Button>
            <Button size="sm" variant="ghost"><Video className="h-4 w-4" /> Video</Button>
            <Button size="sm" variant="ghost"><Paperclip className="h-4 w-4" /> Attach</Button>
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-[var(--color-brand-aqua)]">
              <Sparkles className="h-3.5 w-3.5" /> AI assist on
            </span>
          </div>

          {/* messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {msgs.map((m) => (
              <div key={m.id} className={m.role === "ai" ? "flex justify-end" : "flex"}>
                <div
                  className={
                    m.role === "ai"
                      ? "max-w-[78%] bg-[var(--color-brand-gold)] text-[#1a1530] rounded-2xl rounded-br-md px-4 py-2.5 text-sm font-medium"
                      : "max-w-[78%] bg-[var(--color-surface-2)] text-white/90 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm border border-[var(--color-border)]"
                  }
                >
                  {m.role === "ai" && m.id > 4
                    ? <TextType text={m.text} speed={14} />
                    : m.text}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* AI hint bar */}
          <div className="px-5 py-2 text-xs text-[var(--color-brand-aqua)] bg-[var(--color-brand-aqua)]/8 border-t border-[var(--color-border)] italic">
            💡 AI suggests: Mention 12th-house Mercury for tech-product fit · Saturn 10H = structure
          </div>

          {/* input */}
          <form
            className="flex items-center gap-2 p-4 border-t border-[var(--color-border)]"
            onSubmit={(e) => { e.preventDefault(); send(input); }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type to your client…"
              className="flex-1 bg-[var(--color-surface-2)] text-white placeholder-white/40 text-sm px-3 py-2 rounded-md border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-violet)]"
            />
            <Button type="submit" variant="primary"><Send className="h-4 w-4" /> Send</Button>
          </form>
        </div>
      </div>
    </>
  );
}
