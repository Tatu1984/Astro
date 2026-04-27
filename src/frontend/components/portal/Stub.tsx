import { TopBar } from "@/frontend/components/portal/TopBar";
import { Card } from "@/frontend/components/ui/Card";
import { Construction } from "lucide-react";

export function Stub({ title, light = false }: { title: string; light?: boolean }) {
  return (
    <>
      <TopBar title={title} subtitle="Coming up — designed in this prototype" light={light} />
      <div className="p-6">
        <Card className="grid place-items-center text-center !py-16 max-w-2xl mx-auto">
          <Construction className="h-10 w-10 text-[var(--color-brand-gold)] mb-4" />
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <p className="mt-2 text-sm text-white/60 max-w-md">
            This screen is part of the design spec. Wireframe and component map are documented in
            <code className="mx-1 px-1.5 py-0.5 rounded bg-white/5 text-[var(--color-brand-aqua)]">docs/design/</code>.
            Live implementation lands in the next sprint.
          </p>
        </Card>
      </div>
    </>
  );
}
