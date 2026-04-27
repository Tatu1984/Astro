import { TopBar } from "@/frontend/components/portal/TopBar";
import { CardLight } from "@/frontend/components/ui/CardLight";
import { Construction } from "lucide-react";

export default function Page() {
  return (
    <>
      <TopBar title="Admin · subscriptions" subtitle="Designed in this prototype" light initials="A" />
      <div className="p-6">
        <CardLight className="grid place-items-center text-center !py-16 max-w-2xl mx-auto">
          <Construction className="h-10 w-10 text-[var(--color-brand-violet)] mb-4" />
          <h2 className="text-xl font-semibold">subscriptions</h2>
          <p className="mt-2 text-sm text-[var(--color-ink-muted-light)] max-w-md">
            Wireframe + component map are in <code className="px-1.5 py-0.5 rounded bg-[var(--color-surface-2-light)]">docs/design/</code>.
            Live page lands in next sprint.
          </p>
        </CardLight>
      </div>
    </>
  );
}
