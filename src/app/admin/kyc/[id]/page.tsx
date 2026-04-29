import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { getAdminKycDetail } from "@/backend/services/kyc.service";
import { TopBar } from "@/frontend/components/portal/TopBar";

import { KycReviewPanel } from "./review-panel";

export const dynamic = "force-dynamic";

export default async function AdminKycDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/login");

  const { id } = await params;
  let detail;
  try {
    detail = await getAdminKycDetail(id);
  } catch {
    redirect("/admin/kyc");
  }

  return (
    <>
      <TopBar
        title={detail.fullName}
        subtitle={`${detail.user.email ?? "—"} · ${detail.onboardingStep.replaceAll("_", " ").toLowerCase()} · ${detail.status.toLowerCase()}`}
      />
      <div className="p-6 max-w-4xl space-y-5">
        <Link href="/admin/kyc" className="text-xs text-[var(--color-ink-muted-light)] underline">
          ← Back to inbox
        </Link>

        <div className="rounded-md border border-[var(--color-border-light)] bg-[var(--color-surface-light)] p-4 text-sm">
          <p className="font-semibold mb-1">Profile</p>
          <p className="text-[var(--color-ink-muted-light)]">
            {detail.yearsExperience ?? "—"} yrs experience · {detail.specialties.join(", ") || "—"}
          </p>
          <p className="mt-2 whitespace-pre-wrap">{detail.bio || ""}</p>
          {detail.qualifications ? (
            <p className="mt-2 text-xs text-[var(--color-ink-muted-light)]">
              Qualifications: {detail.qualifications}
            </p>
          ) : null}
        </div>

        <KycReviewPanel
          astrologerProfileId={detail.id}
          documents={detail.kycDocuments}
          onboardingStep={detail.onboardingStep}
          status={detail.status}
        />
      </div>
    </>
  );
}
