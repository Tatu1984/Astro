"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/frontend/components/ui/Button";
import { Card } from "@/frontend/components/ui/Card";

interface Template {
  id: string;
  title: string;
  body: string;
  isShared: boolean;
  astrologerProfileId: string;
}

interface InitialData {
  own: Template[];
  shared: Template[];
}

export function TemplatesEditor({ initial }: { initial: InitialData }) {
  const router = useRouter();
  const [own, setOwn] = useState<Template[]>(initial.own);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [pending, setPending] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  async function createOne() {
    if (!newTitle.trim() || !newBody.trim()) return;
    setPending(true);
    try {
      const res = await fetch("/api/astrologer/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, body: newBody }),
      });
      if (res.ok) {
        const { template } = (await res.json()) as { template: Template };
        setOwn((arr) => [template, ...arr]);
        setNewTitle("");
        setNewBody("");
        setCreating(false);
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  async function saveTemplate(id: string, patch: Partial<Pick<Template, "title" | "body">>) {
    const res = await fetch(`/api/astrologer/templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const { template } = (await res.json()) as { template: Template };
      setOwn((arr) => arr.map((t) => (t.id === id ? template : t)));
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    const res = await fetch(`/api/astrologer/templates/${id}`, { method: "DELETE" });
    if (res.ok) {
      setOwn((arr) => arr.filter((t) => t.id !== id));
      if (activeId === id) setActiveId(null);
    }
  }

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-4">
      <Card className="!p-3">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs uppercase tracking-wider text-white/55">My templates</span>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1 text-xs text-[var(--color-brand-gold)]"
          >
            <Plus className="h-3 w-3" /> New
          </button>
        </div>
        <ul className="space-y-1">
          {own.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => {
                  setActiveId(t.id);
                  setCreating(false);
                }}
                className={
                  "w-full text-left rounded-md px-2 py-1.5 text-sm " +
                  (activeId === t.id
                    ? "bg-[var(--color-brand-violet)]/20 text-white"
                    : "text-white/75 hover:bg-white/5")
                }
              >
                {t.title}
              </button>
            </li>
          ))}
          {own.length === 0 ? (
            <li className="text-xs text-white/45 px-2 py-2">No templates yet.</li>
          ) : null}
        </ul>
        {initial.shared.length > 0 ? (
          <>
            <div className="text-xs uppercase tracking-wider text-white/45 mt-4 mb-2 px-1">
              Shared (admin)
            </div>
            <ul className="space-y-1">
              {initial.shared.map((t) => (
                <li
                  key={t.id}
                  className="rounded-md px-2 py-1.5 text-sm text-white/65 bg-white/5"
                  title={t.body}
                >
                  {t.title}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </Card>

      <div>
        {creating ? (
          <Card>
            <h3 className="text-sm font-semibold text-white mb-3">New template</h3>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title (e.g. Career sign-off)"
              className="w-full rounded-md border border-[var(--color-border)] bg-white/5 px-3 py-2 text-sm text-white"
            />
            <textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder="Body — paste the boilerplate text you reuse most"
              rows={10}
              className="mt-3 w-full rounded-md border border-[var(--color-border)] bg-white/5 px-3 py-2 text-sm text-white resize-y min-h-40"
            />
            <div className="mt-3 flex gap-2">
              <Button variant="gold" size="sm" onClick={createOne} disabled={pending}>
                {pending ? "Saving…" : "Save template"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        ) : activeId ? (
          <ActiveEditor
            key={activeId}
            template={own.find((t) => t.id === activeId)!}
            onSave={(patch) => saveTemplate(activeId, patch)}
            onDelete={() => deleteTemplate(activeId)}
          />
        ) : (
          <Card className="text-sm text-white/55">
            Select a template on the left, or click <strong className="text-white">New</strong> to create one.
            Templates appear in the Live Session page&apos;s &ldquo;Insert template&rdquo; dropdown.
          </Card>
        )}
      </div>
    </div>
  );
}

function ActiveEditor({
  template,
  onSave,
  onDelete,
}: {
  template: Template;
  onSave: (patch: { title?: string; body?: string }) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(template.title);
  const [body, setBody] = useState(template.body);
  const dirty = title !== template.title || body !== template.body;

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Edit template</h3>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1 text-xs text-[var(--color-brand-rose)] hover:underline"
        >
          <Trash2 className="h-3 w-3" /> Delete
        </button>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-md border border-[var(--color-border)] bg-white/5 px-3 py-2 text-sm text-white"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={14}
        className="mt-3 w-full rounded-md border border-[var(--color-border)] bg-white/5 px-3 py-2 text-sm text-white resize-y min-h-48"
      />
      <div className="mt-3 flex gap-2">
        <Button
          variant="gold"
          size="sm"
          disabled={!dirty}
          onClick={() => onSave({ title, body })}
        >
          Save changes
        </Button>
      </div>
    </Card>
  );
}
