import { cn } from "@/frontend/utils/cn";

const PLANETS = [
  { glyph: "☉", name: "Sun",     a: 22,  r: 0.55 },
  { glyph: "☽", name: "Moon",    a: 124, r: 0.62 },
  { glyph: "☿", name: "Mercury", a: 38,  r: 0.45 },
  { glyph: "♀", name: "Venus",   a: 75,  r: 0.50 },
  { glyph: "♂", name: "Mars",    a: 188, r: 0.58 },
  { glyph: "♃", name: "Jupiter", a: 240, r: 0.48 },
  { glyph: "♄", name: "Saturn",  a: 305, r: 0.55 },
  { glyph: "♅", name: "Uranus",  a: 350, r: 0.42 },
];

function pol(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const;
}

export function ChartWheel({
  size = 260,
  spinning = false,
  className,
}: {
  size?: number;
  spinning?: boolean;
  className?: string;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 6;
  const Rinner = R * 0.62;
  const Rcore = R * 0.30;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={cn(spinning && "chart-rotate", className)}
      role="img"
      aria-label="Astrology chart wheel"
    >
      <defs>
        <radialGradient id="cw-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--color-brand-gold)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--color-brand-gold)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cw-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-brand-gold)" />
          <stop offset="100%" stopColor="#d4a93a" />
        </linearGradient>
      </defs>

      {/* outer ring */}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="url(#cw-ring)" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={Rinner} fill="none" stroke="var(--color-brand-gold)" strokeWidth="1" opacity="0.7" />
      <circle cx={cx} cy={cy} r={Rcore} fill="url(#cw-core)" />

      {/* 12 house spokes */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = i * 30;
        const [x1, y1] = pol(cx, cy, Rcore, a);
        const [x2, y2] = pol(cx, cy, R, a);
        return (
          <line
            key={i}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="var(--color-brand-gold)"
            strokeOpacity="0.55"
            strokeWidth="0.7"
          />
        );
      })}

      {/* sign labels in middle ring */}
      {["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"].map((g, i) => {
        const a = i * 30 + 15;
        const r = (R + Rinner) / 2;
        const [x, y] = pol(cx, cy, r, a);
        return (
          <text
            key={g}
            x={x} y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={size * 0.045}
            fill="var(--color-brand-gold)"
            opacity="0.85"
          >
            {g}
          </text>
        );
      })}

      {/* planets */}
      {PLANETS.map((p) => {
        const [x, y] = pol(cx, cy, Rinner * p.r * 1.5, p.a);
        return (
          <g key={p.name}>
            <circle cx={x} cy={y} r={size * 0.038} fill="var(--color-card)" stroke="var(--color-brand-gold)" strokeWidth="0.7" />
            <text
              x={x} y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={size * 0.05}
              fill="var(--color-brand-gold)"
              fontWeight="600"
            >
              {p.glyph}
            </text>
          </g>
        );
      })}

      {/* core asc */}
      <text
        x={cx} y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size * 0.10}
        fill="var(--color-brand-gold)"
        opacity="0.45"
      >
        ♈
      </text>
    </svg>
  );
}
