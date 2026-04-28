import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { auth } from "@/auth";
import { getReport, REPORT_KIND_TITLES } from "@/backend/services/report.service";
import { TopBar } from "@/frontend/components/portal/TopBar";
import { Card } from "@/frontend/components/ui/Card";

export const dynamic = "force-dynamic";

export default async function ReportDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  let report;
  try {
    report = await getReport(session.user.id, id);
  } catch {
    redirect("/user/reports");
  }

  return (
    <>
      <TopBar
        title={report.title}
        subtitle={`${REPORT_KIND_TITLES[report.kind]} · ${report.llmProvider ?? "—"} · ${report.llmModel ?? "—"}`}
      />
      <div className="p-6 space-y-4 max-w-3xl">
        <Link
          href="/user/reports"
          className="inline-flex items-center gap-1.5 text-xs text-white/55 hover:text-white"
        >
          <ArrowLeft className="h-3 w-3" /> All reports
        </Link>

        <Card className="!p-8">
          <article className="prose prose-invert max-w-none
            prose-headings:text-[var(--color-brand-gold)]
            prose-headings:font-semibold
            prose-h2:text-lg prose-h2:mt-7 prose-h2:mb-3
            prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2
            prose-p:text-white/85 prose-p:leading-relaxed prose-p:my-3
            prose-li:text-white/85 prose-li:my-0.5
            prose-strong:text-white prose-strong:font-semibold
            prose-em:text-white/90
            prose-a:text-[var(--color-brand-aqua)]
            prose-hr:border-[var(--color-border)]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.bodyMarkdown}</ReactMarkdown>
          </article>
        </Card>

        <p className="text-[10px] text-white/35 text-center">
          Generated {report.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} · {report.inputTokens + report.outputTokens} tokens
        </p>
      </div>
    </>
  );
}
