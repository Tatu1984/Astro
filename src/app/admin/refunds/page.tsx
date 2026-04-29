import { TopBar } from "@/frontend/components/portal/TopBar";
import { RefundsClient } from "./refunds-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <>
      <TopBar
        title="Admin · refunds"
        subtitle="Issue full or partial refunds"
        light
        initials="A"
      />
      <div className="p-6 space-y-5 max-w-6xl">
        <RefundsClient />
      </div>
    </>
  );
}
