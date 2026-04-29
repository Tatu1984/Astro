import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { listPendingKycInbox } from "@/backend/services/kyc.service";
import { TopBar } from "@/frontend/components/portal/TopBar";

export const dynamic = "force-dynamic";

export default async function AdminKycInbox() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/login");

  const astrologers = await listPendingKycInbox();

  return (
    <>
      <TopBar
        title="KYC inbox"
        subtitle={`${astrologers.length} astrologer${astrologers.length === 1 ? "" : "s"} pending review`}
      />
      <div className="p-6 max-w-5xl">
        {astrologers.length === 0 ? (
          <div className="rounded-md border border-[var(--color-border-light)] bg-[var(--color-surface-light)] p-6 text-sm text-[var(--color-ink-light)]">
            Nothing waiting. All caught up.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-[var(--color-border-light)] bg-[var(--color-surface-light)]">
            <table className="w-full text-sm">
              <thead className="text-left text-[var(--color-ink-muted-light)] uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Step</th>
                  <th className="px-4 py-3">Docs</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {astrologers.map((a) => {
                  const total = a.kycDocuments.length;
                  const approved = a.kycDocuments.filter((d) => d.status === "APPROVED").length;
                  return (
                    <tr key={a.id} className="border-t border-[var(--color-border-light)]">
                      <td className="px-4 py-3 font-medium">{a.fullName}</td>
                      <td className="px-4 py-3 text-[var(--color-ink-muted-light)]">{a.user.email ?? "—"}</td>
                      <td className="px-4 py-3 text-xs uppercase tracking-wider">{a.onboardingStep.replaceAll("_", " ").toLowerCase()}</td>
                      <td className="px-4 py-3 text-xs">{approved}/{total}</td>
                      <td className="px-4 py-3 text-xs text-[var(--color-ink-muted-light)]">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/kyc/${a.id}`}
                          className="text-xs underline text-[var(--color-brand-gold)]"
                        >
                          Review →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
