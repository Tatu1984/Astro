import { TopBar } from "@/frontend/components/portal/TopBar";
import { FlagsClient } from "./flags-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <>
      <TopBar title="Admin · feature flags" subtitle="Toggles + rollout %" light initials="A" />
      <div className="p-6 space-y-5 max-w-4xl">
        <FlagsClient />
      </div>
    </>
  );
}
