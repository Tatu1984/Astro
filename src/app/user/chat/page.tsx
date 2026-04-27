"use client";
import { ChartWheel } from "@/frontend/components/astro/ChartWheel";
import { Card } from "@/frontend/components/ui/Card";
import { Button } from "@/frontend/components/ui/Button";
import { Badge } from "@/frontend/components/ui/Badge";
import { TopBar } from "@/frontend/components/portal/TopBar";
import { TextType } from "@/frontend/components/effects/TextType";
import { Send, Sparkles } from "lucide-react";
import { useState, useEffect, useRef } from "react";

type Msg = { id: number; role: "user" | "ai"; text: string };

const SEED: Msg[] = [
  { id: 1, role: "ai",   text: "Hi Maya ✦ ask me anything about your chart. I see your context: Vedic, Sat/Mer dasha, Asc Cancer." },
  { id: 2, role: "user", text: "What career suits me in 2027?" },
  { id: 3, role: "ai",   text: "With Saturn transiting your 10th and Jupiter on your Sun, mid-2027 favours analytical roles with creative leverage — product, design strategy, research. The 12H Mercury hints at a tech-product fit." },
];

const QUICK = ["When marry?", "Best year?", "Health?", "Career switch?", "Money flow?"];

export default function AiChat() {
  const [msgs, setMsgs] = useState<Msg[]>(SEED);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const send = (text: string) => {
    if (!text.trim()) return;
    const next = [...msgs, { id: Date.now(), role: "user" as const, text }];
    setMsgs(next);
    setInput("");
    setTimeout(() => {
      setMsgs((m) => [
        ...m,
        {
          id: Date.now() + 1,
          role: "ai",
          text: `Looking at your chart for "${text.toLowerCase().replace(/\?$/, '')}": Saturn-Mercury dasha is analytical; Jupiter aspects open windows in May 2027. The strongest period is between 12 May and 30 Jul — Jupiter conjunct your Sun gives natural authority during this run.`,
        },
      ]);
    }, 400);
  };

  return (
    <>
      <TopBar
        title="AI Chat with your chart"
        subtitle="Grounded in deterministic chart math · Vedic · Maya"
        right={<Badge tone="aqua">Gemini 2.5 Pro</Badge>}
      />
      <div className="p-6 grid lg:grid-cols-[320px_1fr] gap-6 h-[calc(100dvh-3.5rem)] overflow-hidden">
        {/* context */}
        <Card accent="gold" className="overflow-y-auto tilt">
          <h3 className="font-semibold text-[var(--color-brand-gold)] mb-3">Chart context</h3>
          <div className="grid place-items-center my-3">
            <ChartWheel size={200} />
          </div>
          <ul className="text-sm space-y-1.5 text-white/75 mt-2">
            <li>Profile · Maya</li>
            <li>System · Vedic</li>
            <li>Houses · Whole sign</li>
            <li>Dasha · Sat/Mer</li>
            <li>Transits · live</li>
          </ul>
          <div className="mt-5 text-xs text-white/45 italic">
            All AI answers cite specific chart facts. Hover any answer to see sources.
          </div>
        </Card>

        {/* thread */}
        <div className="flex flex-col bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {msgs.map((m) => (
              <div
                key={m.id}
                className={m.role === "user" ? "flex justify-end" : "flex"}
              >
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[78%] bg-[var(--color-brand-violet)] text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm"
                      : "max-w-[78%] bg-[var(--color-surface-2)] text-white/90 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm border border-[var(--color-border)]"
                  }
                >
                  {m.role === "ai" && m.id > 3
                    ? <TextType text={m.text} speed={14} />
                    : m.text}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* quick prompts */}
          <div className="px-5 pt-2 pb-1 flex flex-wrap gap-2 border-t border-[var(--color-border)]">
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="text-xs px-3 py-1.5 rounded-full bg-[var(--color-surface-2)] text-white/70 hover:text-white hover:bg-white/10"
              >
                {q}
              </button>
            ))}
          </div>

          {/* input */}
          <form
            className="flex items-center gap-2 p-4 border-t border-[var(--color-border)]"
            onSubmit={(e) => { e.preventDefault(); send(input); }}
          >
            <Sparkles className="h-4 w-4 text-[var(--color-brand-gold)] shrink-0" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your chart…"
              className="flex-1 bg-[var(--color-surface-2)] text-white placeholder-white/40 text-sm px-3 py-2 rounded-md border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-violet)]"
            />
            <Button type="submit" variant="gold" size="md">
              <Send className="h-4 w-4" /> Send
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
