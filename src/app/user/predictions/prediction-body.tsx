"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { GlossaryTerm } from "@/frontend/components/glossary/GlossaryTerm";
import { Card } from "@/frontend/components/ui/Card";

export interface DisplayFact {
  code: string;
  term: string;
  humanText: string;
}

interface Props {
  headline: string;
  body: string;
  domains: {
    career: { score: number; body: string };
    love: { score: number; body: string };
    health: { score: number; body: string };
  };
  displayFacts: DisplayFact[];
  rangeLabel: string;
  provider?: string | null;
}

export function PredictionBody({
  headline,
  body,
  domains,
  displayFacts,
  rangeLabel,
  provider,
}: Props) {
  const [showExplanations, setShowExplanations] = useState(true);

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-6 px-6 py-2 backdrop-blur-sm bg-[color:var(--color-bg)]/70 border-b border-white/5 flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-white/45">{rangeLabel}</p>
        <label className="inline-flex items-center gap-2 text-xs text-white/70 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showExplanations}
            onChange={(e) => setShowExplanations(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-white/20 bg-white/10 accent-[var(--color-brand-violet)]"
          />
          Show explanations
        </label>
      </div>

      <Card accent="gold" className="space-y-2">
        <h2 className="text-2xl font-semibold text-white">{headline}</h2>
        <article
          className={
            "prose prose-invert max-w-none " +
            "prose-p:text-white/80 prose-p:leading-relaxed prose-p:my-2.5 " +
            "prose-strong:text-white prose-em:text-white/65 " +
            (showExplanations ? "" : "[&_em]:hidden")
          }
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              em: ({ children, ...props }) => (
                <em {...props} className="gloss text-white/65">
                  {children}
                </em>
              ),
            }}
          >
            {body}
          </ReactMarkdown>
        </article>
        {provider ? (
          <div className="pt-2 text-[10px] uppercase tracking-wider text-white/40">{provider}</div>
        ) : null}
      </Card>

      <div className="grid md:grid-cols-3 gap-5">
        {(["career", "love", "health"] as const).map((domain) => {
          const d = domains[domain];
          const title = domain.charAt(0).toUpperCase() + domain.slice(1);
          return (
            <Card key={domain}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[var(--color-brand-gold)]">{title}</h3>
                <span className="text-2xl font-semibold text-white">{d.score}</span>
              </div>
              <article
                className={
                  "prose prose-invert max-w-none " +
                  "prose-p:text-white/75 prose-p:leading-relaxed prose-p:my-1 prose-p:text-sm " +
                  "prose-em:text-white/55 " +
                  (showExplanations ? "" : "[&_em]:hidden")
                }
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{d.body}</ReactMarkdown>
              </article>
              <div className="mt-4 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--color-brand-violet)] to-[var(--color-brand-aqua)]"
                  style={{ width: `${d.score}%` }}
                />
              </div>
            </Card>
          );
        })}
      </div>

      {displayFacts.length ? (
        <Card>
          <h3 className="text-sm font-semibold text-[var(--color-brand-aqua)] mb-3">
            What&apos;s driving this reading
          </h3>
          <ul className="grid sm:grid-cols-2 gap-2">
            {displayFacts.map((f) => (
              <li
                key={f.code}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2"
              >
                <p className="text-xs text-white">
                  <FactTerm term={f.term} />
                </p>
                <p className="text-[11px] text-white/60 mt-0.5 leading-relaxed">{f.humanText}</p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

/**
 * Wrap recognised astrological terms inside a fact line in <GlossaryTerm>.
 * Heuristic: split by "," and " in " and try lookup on each piece.
 */
function FactTerm({ term }: { term: string }) {
  // Tokenise on commas, "in", and parens; wrap recognised words.
  const parts = term.split(/(\bin\b|,|\(|\))/g);
  return (
    <>
      {parts.map((p, idx) => {
        const trimmed = p.trim();
        if (!trimmed) return p;
        // Try to match the fragment as a glossary term (e.g. "Sun", "Leo", "house 7")
        return (
          <GlossaryTerm key={idx} term={trimmed}>
            {p}
          </GlossaryTerm>
        );
      })}
    </>
  );
}
