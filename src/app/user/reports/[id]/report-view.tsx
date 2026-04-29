"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Card } from "@/frontend/components/ui/Card";

type Heading = { id: string; text: string; level: 2 | 3 };

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

function extractHeadings(markdown: string): Heading[] {
  const out: Heading[] = [];
  const seen = new Map<string, number>();
  for (const line of markdown.split("\n")) {
    const m = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const level = m[1].length as 2 | 3;
    const text = m[2].trim();
    let id = slug(text);
    const dup = seen.get(id) ?? 0;
    if (dup) id = `${id}-${dup}`;
    seen.set(slug(text), dup + 1);
    out.push({ id, text, level });
  }
  return out;
}

type Props = {
  bodyMarkdown: string;
};

export function ReportView({ bodyMarkdown }: Props) {
  const headings = useMemo(() => extractHeadings(bodyMarkdown), [bodyMarkdown]);

  // ReactMarkdown will produce headings without ids by default. We assign
  // ids by index using a custom component.
  let h2Index = 0;
  let h3Index = 0;
  const idForLevel = (level: 2 | 3): string => {
    const candidates = headings.filter((h) => h.level === level);
    const idx = level === 2 ? h2Index++ : h3Index++;
    return candidates[idx]?.id ?? "";
  };

  return (
    <div className="grid lg:grid-cols-[200px_1fr] gap-6">
      <aside className="hidden lg:block">
        <nav className="sticky top-6">
          <h3 className="text-[10px] uppercase tracking-wider text-white/40 mb-2">On this report</h3>
          <ul className="space-y-1 text-xs">
            {headings.map((h) => (
              <li key={h.id} className={h.level === 3 ? "pl-3" : ""}>
                <a href={`#${h.id}`} className="text-white/65 hover:text-white">
                  {h.text}
                </a>
              </li>
            ))}
            {headings.length === 0 ? <li className="text-white/40">No sections</li> : null}
          </ul>
        </nav>
      </aside>
      <Card className="!p-8">
        <article
          className="prose prose-invert max-w-none
            prose-headings:text-[var(--color-brand-gold)]
            prose-headings:font-semibold
            prose-h2:text-lg prose-h2:mt-7 prose-h2:mb-3
            prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2
            prose-p:text-white/85 prose-p:leading-relaxed prose-p:my-3
            prose-li:text-white/85 prose-li:my-0.5
            prose-strong:text-white prose-strong:font-semibold
            prose-em:text-white/90
            prose-a:text-[var(--color-brand-aqua)]
            prose-hr:border-[var(--color-border)]"
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2: ({ children, ...props }) => (
                <h2 id={idForLevel(2)} {...props}>
                  {children}
                </h2>
              ),
              h3: ({ children, ...props }) => (
                <h3 id={idForLevel(3)} {...props}>
                  {children}
                </h3>
              ),
            }}
          >
            {bodyMarkdown}
          </ReactMarkdown>
        </article>
      </Card>
    </div>
  );
}
