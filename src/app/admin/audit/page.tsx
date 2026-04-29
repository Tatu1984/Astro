import { TopBar } from "@/frontend/components/portal/TopBar";
import { AuditClient } from "./audit-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <>
      <TopBar title="Admin · audit" subtitle="Privileged action history" light initials="A" />
      <div className="p-6 space-y-5 max-w-6xl">
        <AuditClient />
      </div>
    </>
  );
}
