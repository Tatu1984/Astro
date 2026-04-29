import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { listOwnKycDocuments, OPTIONAL_KINDS, REQUIRED_KINDS } from "@/backend/services/kyc.service";
import { TopBar } from "@/frontend/components/portal/TopBar";

import { OnboardingChecklist } from "./onboarding-checklist";

export const dynamic = "force-dynamic";

export default async function AstrologerOnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ASTROLOGER") redirect("/user");

  let snapshot;
  try {
    snapshot = await listOwnKycDocuments(session.user.id);
  } catch {
    redirect("/astrologer-signup");
  }

  return (
    <>
      <TopBar
        title="KYC onboarding"
        subtitle={`Step: ${snapshot.onboardingStep.replaceAll("_", " ").toLowerCase()}`}
      />
      <div className="p-6 max-w-3xl">
        <OnboardingChecklist
          required={REQUIRED_KINDS}
          optional={OPTIONAL_KINDS}
          documents={snapshot.documents}
          onboardingStep={snapshot.onboardingStep}
        />
      </div>
    </>
  );
}
