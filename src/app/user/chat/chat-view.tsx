"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Send, Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/frontend/components/ui/Button";

interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  llmProvider?: string | null;
  llmModel?: string | null;
  createdAt: string;
}

interface ChatSession {
  id: string;
  title: string | null;
  updatedAt: string;
  messages: ChatMessage[];
  profile?: { id: string; fullName: string } | null;
}

export interface SessionListItem {
  id: string;
  title: string | null;
  updatedAt: string;
  messageCount: number;
}

interface Props {
  initialSessions: SessionListItem[];
  initialActive: ChatSession | null;
}

const QUICK_PROMPTS = [
  "What career suits me?",
  "When is my best year?",
  "How do I handle stress?",
  "Strengths in relationships?",
  "How can I find more focus?",
];

export function ChatView({ initialSessions, initialActive }: Props) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [active, setActive] = useState<ChatSession | null>(initialActive);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages.length]);

  async function newSession() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/chat/sessions", { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? `failed (${res.status})`);
        return;
      }
      const { session } = (await res.json()) as { session: { id: string } };
      router.push(`/user/chat?session=${session.id}`);
      router.refresh();
    });
  }

  async function deleteSession(id: string) {
    if (!confirm("Delete this conversation?")) return;
    startTransition(async () => {
      const res = await fetch(`/api/chat/sessions/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSessions((s) => s.filter((x) => x.id !== id));
        if (active?.id === id) {
          setActive(null);
          router.push("/user/chat");
        }
        router.refresh();
      }
    });
  }

  async function send(text: string) {
    if (!active || !text.trim() || sending) return;
    setError(null);
    setSending(true);

    // Optimistic user message
    const tempId = `temp-${Date.now()}`;
    setActive({
      ...active,
      messages: [
        ...active.messages,
        { id: tempId, role: "USER", content: text, createdAt: new Date().toISOString() },
      ],
    });
    setInput("");

    const res = await fetch(`/api/chat/sessions/${active.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    setSending(false);

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? `failed (${res.status})`);
      // remove the optimistic user message
      setActive((a) => (a ? { ...a, messages: a.messages.filter((m) => m.id !== tempId) } : a));
      return;
    }

    const { userMessage, assistantMessage } = (await res.json()) as {
      userMessage: ChatMessage;
      assistantMessage: ChatMessage;
    };
    setActive((a) =>
      a
        ? {
            ...a,
            messages: [
              ...a.messages.filter((m) => m.id !== tempId),
              userMessage,
              assistantMessage,
            ],
          }
        : a,
    );
    // Refresh the sidebar via a router refresh so sessions reorder.
    router.refresh();
  }

  return (
    <div className="grid grid-cols-[280px_1fr] gap-4 p-4 h-[calc(100dvh-3.5rem)]">
      {/* sidebar */}
      <aside className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col overflow-hidden">
        <div className="p-3 border-b border-[var(--color-border)]">
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            onClick={newSession}
            disabled={pending}
          >
            <Plus className="h-4 w-4" /> New chat
          </Button>
        </div>
        <ul className="flex-1 overflow-y-auto py-2">
          {sessions.length === 0 ? (
            <li className="px-3 py-2 text-xs text-white/40">No conversations yet.</li>
          ) : (
            sessions.map((s) => {
              const isActive = active?.id === s.id;
              return (
                <li key={s.id} className={isActive ? "bg-white/5" : ""}>
                  <button
                    type="button"
                    onClick={() => router.push(`/user/chat?session=${s.id}`)}
                    className="w-full text-left px-3 py-2 hover:bg-white/5 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white truncate">
                          {s.title ?? "Untitled chat"}
                        </p>
                        <p className="text-[10px] text-white/40 mt-0.5">
                          {new Date(s.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                          {" · "}
                          {s.messageCount} msg{s.messageCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(s.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.stopPropagation();
                            deleteSession(s.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-white p-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </span>
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </aside>

      {/* thread */}
      {active ? (
        <main className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col overflow-hidden">
          <header className="px-4 py-3 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-medium text-white truncate">{active.title ?? "New chat"}</h2>
            <p className="text-[11px] text-white/40">
              <Sparkles className="inline h-3 w-3 -mt-0.5 mr-1" />
              Grounded in {active.profile?.fullName ?? "your"} natal chart
            </p>
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {active.messages.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-white/55">
                  Ask anything about your chart — career, relationships, life themes.
                </p>
                <div className="mt-5 flex flex-wrap gap-2 justify-center">
                  {QUICK_PROMPTS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => send(q)}
                      disabled={sending}
                      className="rounded-full border border-[var(--color-border)] bg-white/5 hover:bg-white/10 px-3 py-1 text-xs text-white/80"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              active.messages.map((m) => (
                <div
                  key={m.id}
                  className={
                    m.role === "USER"
                      ? "ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-[var(--color-brand-violet)] text-white px-4 py-2.5 text-sm"
                      : "mr-auto max-w-[80%] rounded-2xl rounded-bl-sm bg-white/5 border border-[var(--color-border)] text-white/90 px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                  }
                >
                  {m.content}
                </div>
              ))
            )}
            {sending ? (
              <div className="mr-auto max-w-[80%] rounded-2xl rounded-bl-sm bg-white/5 border border-[var(--color-border)] px-4 py-2.5 text-sm text-white/55">
                Thinking…
              </div>
            ) : null}
            <div ref={endRef} />
          </div>

          <div className="border-t border-[var(--color-border)] p-3">
            {error ? <p className="text-xs text-[var(--color-brand-rose)] mb-2">{error}</p> : null}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your chart…"
                disabled={sending}
                className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 h-9 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-violet)]"
                maxLength={4000}
              />
              <Button type="submit" variant="gold" size="md" disabled={sending || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </main>
      ) : (
        <main className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] grid place-items-center">
          <div className="text-center max-w-md p-6">
            <h2 className="text-lg font-semibold text-white">AI Chat with your chart</h2>
            <p className="text-sm text-white/55 mt-2">
              Start a new conversation to ask anything about your natal chart. Each chat is grounded in your real planet positions and houses.
            </p>
            <div className="mt-5">
              <Button variant="primary" onClick={newSession} disabled={pending}>
                <Plus className="h-4 w-4" /> New chat
              </Button>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
