import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/auth";
import { getReport, REPORT_KIND_TITLES } from "@/backend/services/report.service";
import { TopBar } from "@/frontend/components/portal/TopBar";

import { DownloadPdfButton } from "./download-pdf-button";
import { ReportView } from "./report-view";

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
        right={<DownloadPdfButton reportId={report.id} />}
      />
      <div className="p-6 space-y-4 max-w-5xl">
        <Link
          href="/user/reports"
          className="inline-flex items-center gap-1.5 text-xs text-white/55 hover:text-white"
        >
          <ArrowLeft className="h-3 w-3" /> All reports
        </Link>

        <ReportView bodyMarkdown={report.bodyMarkdown} />

        <p className="text-[10px] text-white/35 text-center">
          Generated {report.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} · {report.inputTokens + report.outputTokens} tokens
        </p>
      </div>
    </>
  );
}
