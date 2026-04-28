import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { auth } from "@/auth";
import { getCompatibility } from "@/backend/services/synastry.service";
import { TopBar } from "@/frontend/components/portal/TopBar";
import { Card } from "@/frontend/components/ui/Card";

export const dynamic = "force-dynamic";

interface SynastryAspect {
  a: string;
  b: string;
  aspect: string;
  delta: number;
  weight: number;
}

const KIND_LABEL: Record<string, string> = {
  ROMANTIC: "Romantic",
  FRIENDSHIP: "Friendship",
  BUSINESS: "Business",
  FAMILY: "Family",
};

const ASPECT_TONE: Record<string, string> = {
  conjunction: "border-white/30 bg-white/5",
  sextile: "border-[var(--color-brand-aqua)]/40 bg-[var(--color-brand-aqua)]/10",
  trine: "border-[var(--color-brand-aqua)]/60 bg-[var(--color-brand-aqua)]/15",
  square: "border-[var(--color-brand-rose)]/40 bg-[var(--color-brand-rose)]/10",
  opposition: "border-[var(--color-brand-rose)]/60 bg-[var(--color-brand-rose)]/15",
};

function scoreTone(score: number): string {
  if (score >= 75) return "text-[var(--color-brand-aqua)]";
  if (score >= 55) return "text-[var(--color-brand-gold)]";
  if (score >= 35) return "text-white/70";
  return "text-[var(--color-brand-rose)]";
}

export default async function CompatibilityDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  let compat;
  try {
    compat = await getCompatibility(session.user.id, id);
  } catch {
    redirect("/user/compatibility");
  }

  type AshtakootBlob = {
    total: number;
    totalMax: number;
    verdict: string;
    kootas: Record<
      string,
      { score: number; max: number; a?: string; b?: string }
    >;
  };
  const details = compat.details as {
    aspects?: SynastryAspect[];
    counts?: Record<string, number>;
    westernScore?: number;
    ashtakoot?: AshtakootBlob | null;
  };
  const aspects: SynastryAspect[] = (details.aspects ?? [])
    .slice()
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    .slice(0, 12);
  const counts = details.counts ?? {};
  const ashta = details.ashtakoot ?? null;

  return (
    <>
      <TopBar
        title={`${compat.profileA.fullName} & ${compat.profileB.fullName}`}
        subtitle={`${KIND_LABEL[compat.kind]} compatibility · ${compat.llmProvider ?? "—"} · ${compat.llmModel ?? "—"}`}
      />
      <div className="p-6 space-y-6 max-w-3xl">
        <Link href="/user/compatibility" className="inline-flex items-center gap-1.5 text-xs text-white/55 hover:text-white">
          <ArrowLeft className="h-3 w-3" /> All compatibilities
        </Link>

        <Card className="!p-6 grid sm:grid-cols-[auto_1fr] gap-6 items-center">
          <div className="text-center">
            <div className={`text-6xl font-semibold tabular-nums ${scoreTone(compat.score)}`}>
              {compat.score}
            </div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">/ 100</div>
          </div>
          <div className="text-sm text-white/70 space-y-1.5">
            <p>
              <strong className="text-white">{compat.profileA.fullName}</strong> and <strong className="text-white">{compat.profileB.fullName}</strong>
            </p>
            <p className="text-xs">
              {Object.entries(counts).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}${n === 1 ? "" : "s"}`).join(" · ")}
              {typeof details.westernScore === "number" && ashta ? (
                <>
                  {" · "}
                  Western {details.westernScore} · Ashtakoot {ashta.total}/{ashta.totalMax}
                </>
              ) : null}
            </p>
            <p className="text-xs text-white/45">
              {ashta
                ? "Romantic compatibility blends Western synastry (40%) with Ashtakoot Milan (60%); narrative below has the real texture."
                : "Score reflects aspect harmony between the two charts; the narrative below is what really matters."}
            </p>
          </div>
        </Card>

        {ashta ? (
          <Card className="!p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs uppercase tracking-wider text-[var(--color-brand-gold)]">Ashtakoot Milan</h3>
              <span
                className={
                  ashta.verdict === "outstanding" || ashta.verdict === "excellent"
                    ? "rounded-full border border-[var(--color-brand-aqua)]/40 bg-[var(--color-brand-aqua)]/10 text-[var(--color-brand-aqua)] px-2 py-0.5 text-[10px] uppercase tracking-wider"
                    : ashta.verdict === "acceptable"
                    ? "rounded-full border border-[var(--color-brand-gold)]/40 bg-[var(--color-brand-gold)]/10 text-[var(--color-brand-gold)] px-2 py-0.5 text-[10px] uppercase tracking-wider"
                    : "rounded-full border border-[var(--color-brand-rose)]/40 bg-[var(--color-brand-rose)]/10 text-[var(--color-brand-rose)] px-2 py-0.5 text-[10px] uppercase tracking-wider"
                }
              >
                {ashta.total}/{ashta.totalMax} · {ashta.verdict}
              </span>
            </div>
            <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              {Object.entries(ashta.kootas).map(([k, v]) => {
                const pct = v.score / v.max;
                const tone =
                  pct >= 0.8
                    ? "border-[var(--color-brand-aqua)]/40 bg-[var(--color-brand-aqua)]/10"
                    : pct >= 0.4
                    ? "border-[var(--color-border)] bg-white/5"
                    : "border-[var(--color-brand-rose)]/40 bg-[var(--color-brand-rose)]/10";
                return (
                  <li key={k} className={`rounded-md border ${tone} px-3 py-2`}>
                    <div className="capitalize text-white">{k.replace(/([A-Z])/g, " $1")}</div>
                    <div className="text-[10px] text-white/45 uppercase tracking-wider mt-0.5">
                      {v.score}/{v.max}
                      {v.a && v.b ? (
                        <>
                          {" · "}
                          {v.a} ↔ {v.b}
                        </>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="text-[11px] text-white/40 mt-3">
              ≥18 acceptable · ≥24 excellent · ≥28 outstanding · &lt;18 marginal · &lt;12 incompatible.
            </p>
          </Card>
        ) : null}

        {aspects.length ? (
          <Card className="!p-5">
            <h3 className="text-xs uppercase tracking-wider text-[var(--color-brand-gold)] mb-3">Top aspects</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {aspects.map((a, i) => (
                <li
                  key={i}
                  className={`rounded-md border ${ASPECT_TONE[a.aspect] ?? "border-white/10 bg-white/5"} px-3 py-2`}
                >
                  <div className="text-white">
                    {a.a} <span className="text-white/40">{a.aspect}</span> {a.b}
                  </div>
                  <div className="text-[10px] text-white/45 uppercase tracking-wider">
                    orb {a.delta.toFixed(1)}° · weight {a.weight > 0 ? `+${a.weight}` : a.weight}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {compat.text ? (
          <Card className="!p-8">
            <article className="prose prose-invert max-w-none
              prose-headings:text-[var(--color-brand-gold)] prose-headings:font-semibold
              prose-h2:text-lg prose-h2:mt-7 prose-h2:mb-3
              prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2
              prose-p:text-white/85 prose-p:leading-relaxed
              prose-li:text-white/85
              prose-strong:text-white prose-strong:font-semibold">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{compat.text}</ReactMarkdown>
            </article>
          </Card>
        ) : null}
      </div>
    </>
  );
}
