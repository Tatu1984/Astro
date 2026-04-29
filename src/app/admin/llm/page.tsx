import { TopBar } from "@/frontend/components/portal/TopBar";
import { LlmDashboard } from "./llm-dashboard";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <>
      <TopBar
        title="Admin · LLM cost"
        subtitle="Per-call observability across providers and surfaces"
        light
        initials="A"
      />
      <div className="p-6 space-y-5 max-w-6xl">
        <LlmDashboard />
      </div>
    </>
  );
}
