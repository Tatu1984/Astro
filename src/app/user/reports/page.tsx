import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookHeart,
  Briefcase,
  GraduationCap,
  HeartPulse,
  ScrollText,
  Sparkles,
} from "lucide-react";
import type { ReportKind } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/backend/database/client";
import { listReports, REPORT_KIND_BLURBS, REPORT_KIND_TITLES } from "@/backend/services/report.service";
import { TopBar } from "@/frontend/components/portal/TopBar";
import { Card } from "@/frontend/components/ui/Card";

import { GenerateReportButton } from "./generate-button";

export const dynamic = "force-dynamic";

const ICONS: Record<ReportKind, React.ReactNode> = {
  NATAL_FULL: <ScrollText className="h-4 w-4" />,
  CAREER_WEALTH: <Briefcase className="h-4 w-4" />,
  LOVE_MARRIAGE: <BookHeart className="h-4 w-4" />,
  HEALTH: <HeartPulse className="h-4 w-4" />,
  EDUCATION: <GraduationCap className="h-4 w-4" />,
  SPIRITUAL: <Sparkles className="h-4 w-4" />,
};

const KINDS: ReportKind[] = ["NATAL_FULL", "CAREER_WEALTH", "LOVE_MARRIAGE", "HEALTH", "EDUCATION", "SPIRITUAL"];

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [profile, reports] = await Promise.all([
    prisma.profile.findFirst({
      where: { userId: session.user.id, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }),
    listReports(session.user.id),
  ]);

  return (
    <>
      <TopBar
        title="Reports"
        subtitle="Long-form readings · 800–1,400 words · gemini-2.5-pro"
      />
      <div className="p-6 space-y-6 max-w-5xl">
        <section>
          <h2 className="text-xs uppercase tracking-wider text-white/45 mb-3">Generate a new report</h2>
          {!profile ? (
            <Card className="!p-5">
              <p className="text-sm text-white/65">
                Add a birth profile first to generate reports.{" "}
                <Link href="/user/profile" className="text-[var(--color-brand-gold)] hover:underline">
                  Add profile →
                </Link>
              </p>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {KINDS.map((kind) => (
                <Card key={kind} className="!p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 text-[var(--color-brand-gold)]">
                      {ICONS[kind]}
                      <h3 className="font-semibold text-sm">{REPORT_KIND_TITLES[kind]}</h3>
                    </div>
                    <GenerateReportButton kind={kind} profileId={profile.id} />
                  </div>
                  <p className="text-xs text-white/55 leading-relaxed">{REPORT_KIND_BLURBS[kind]}</p>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-wider text-white/45 mb-3">Your reports</h2>
          {reports.length === 0 ? (
            <Card className="!p-8 text-center">
              <p className="text-sm text-white/55">No reports generated yet.</p>
              <p className="text-xs text-white/40 mt-1">Pick one of the cards above to write your first report.</p>
            </Card>
          ) : (
            <ul className="space-y-2">
              {reports.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/user/reports/${r.id}`}
                    className="block rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-white/5 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[var(--color-brand-gold)]">{ICONS[r.kind]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">{r.title}</div>
                        <div className="text-[10px] text-white/40 mt-0.5 uppercase tracking-wider">
                          {REPORT_KIND_TITLES[r.kind]} · {fmtDate(r.createdAt)} · {r.llmModel ?? "—"}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
