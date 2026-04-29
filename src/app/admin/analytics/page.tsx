import { TopBar } from "@/frontend/components/portal/TopBar";

import { AnalyticsView } from "./analytics-view";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <>
      <TopBar
        title="Admin · Analytics"
        subtitle="Funnel, cohort retention, anomaly alerts"
        light
        initials="A"
      />
      <div className="p-6 max-w-6xl">
        <AnalyticsView />
      </div>
    </>
  );
}
