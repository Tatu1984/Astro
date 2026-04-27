import { ChartWheel } from "@/frontend/components/astro/ChartWheel";
import { Card } from "@/frontend/components/ui/Card";
import { Button } from "@/frontend/components/ui/Button";
import { Badge } from "@/frontend/components/ui/Badge";
import { TopBar } from "@/frontend/components/portal/TopBar";
import { Sparkles } from "lucide-react";

const PLANETS = [
  { name: "Sun",     pos: "Cancer 22°",  house: "1H" },
  { name: "Moon",    pos: "Pisces 04°",  house: "9H · Revati" },
  { name: "Mercury", pos: "Cancer 28°",  house: "1H" },
  { name: "Venus",   pos: "Taurus 09°",  house: "11H" },
  { name: "Mars",    pos: "Leo 17°",     house: "2H" },
  { name: "Jupiter", pos: "Sag 22°",     house: "6H · R" },
  { name: "Saturn",  pos: "Aqua 03°",    house: "8H" },
  { name: "Rahu",    pos: "Gem 14°",     house: "12H" },
];

const DASHA = [
  { name: "Sat", years: 19, frac: 0.85 },
  { name: "Mer", years: 17, frac: 0.55 },
  { name: "Ket", years: 7,  frac: 0.30 },
  { name: "Ven", years: 20, frac: 0.92 },
  { name: "Sun", years: 6,  frac: 0.25 },
  { name: "Moo", years: 10, frac: 0.40 },
];

const ASPECT_GRID = Array.from({ length: 64 }).map((_, i) => {
  const colors = [
    "bg-[var(--color-brand-violet)]/55",
    "bg-[var(--color-brand-aqua)]/55",
    "bg-[var(--color-brand-gold)]/55",
    "bg-[var(--color-brand-rose)]/55",
    "bg-white/10",
  ];
  return colors[i % 5];
});

export default function ChartWorkspace() {
  return (
    <>
      <TopBar
        title="Maya · Natal · Vedic"
        subtitle="Whole sign houses · Lahiri ayanamsa"
        right={
          <div className="hidden md:flex items-center gap-2">
            <Badge tone="violet">D1 Rasi</Badge>
            <Button size="sm" variant="outline">Switch profile</Button>
          </div>
        }
      />
      <div className="p-6 space-y-6">
        {/* div tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {["D1 Rasi", "D9 Navamsa", "D10", "D12", "D60", "Transits"].map((t, i) => (
            <button
              key={t}
              className={
                i === 0
                  ? "px-3 py-1.5 text-xs font-semibold rounded-md bg-[var(--color-brand-violet)] text-white"
                  : "px-3 py-1.5 text-xs rounded-md bg-[var(--color-card)] border border-[var(--color-border)] text-white/70 hover:text-white"
              }
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          {/* wheel + aspect grid */}
          <div className="space-y-6">
            <Card accent="gold" className="grid place-items-center !py-10">
              <ChartWheel size={420} />
            </Card>
            <Card>
              <h3 className="font-semibold text-[var(--color-brand-gold)] mb-4">Aspect grid</h3>
              <div className="grid grid-cols-8 gap-1.5">
                {ASPECT_GRID.map((c, i) => (
                  <div key={i} className={`aspect-square rounded ${c}`} />
                ))}
              </div>
              <p className="text-xs text-white/50 mt-3">8 × 8 planet-vs-planet · click a cell to inspect</p>
            </Card>
          </div>

          {/* planet table + dasha */}
          <div className="space-y-6">
            <Card>
              <h3 className="font-semibold text-[var(--color-brand-gold)] mb-4">Planets</h3>
              <ul className="text-sm divide-y divide-[var(--color-border)]">
                {PLANETS.map((p) => (
                  <li key={p.name} className="flex items-center justify-between py-2.5">
                    <span className="text-white">{p.name}</span>
                    <span className="text-white/60 text-xs tabular-nums">{p.pos} · {p.house}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card accent="violet">
              <h3 className="font-semibold text-[var(--color-brand-gold)] mb-4">Vimshottari Dasha</h3>
              <div className="space-y-2.5">
                {DASHA.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <span className="w-10 text-white/60">{d.name}</span>
                    <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[var(--color-brand-violet)] to-[var(--color-brand-aqua)]"
                        style={{ width: `${d.frac * 100}%` }}
                      />
                    </div>
                    <span className="w-10 text-right tabular-nums text-white/70">{d.years}y</span>
                  </div>
                ))}
              </div>
            </Card>
            <Button variant="gold" className="w-full">
              <Sparkles className="h-4 w-4" /> AI · Explain my chart
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
