import type { NatalResponse, PlanetPosition } from "@/shared/types/chart";
import { cn } from "@/frontend/utils/cn";

const SIGN_GLYPHS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

const PLANET_GLYPHS: Record<string, string> = {
  Sun: "☉",
  Moon: "☽",
  Mercury: "☿",
  Venus: "♀",
  Mars: "♂",
  Jupiter: "♃",
  Saturn: "♄",
  Uranus: "♅",
  Neptune: "♆",
  Pluto: "♇",
  MeanNode: "☊",
  TrueNode: "☊",
  Chiron: "⚷",
};

// Decorative fallback used when no chart is supplied (landing page, etc.)
const DECOR_PLANETS = [
  { glyph: "☉", a: 22 }, { glyph: "☽", a: 124 },
  { glyph: "☿", a: 38 }, { glyph: "♀", a: 75 },
  { glyph: "♂", a: 188 }, { glyph: "♃", a: 240 },
  { glyph: "♄", a: 305 }, { glyph: "♅", a: 350 },
];

/**
 * Convert an ecliptic longitude to an SVG (x, y) on the wheel.
 *
 * Astrology convention: Ascendant on the LEFT (9 o'clock), houses run
 * counterclockwise from there (so cusp 4 / IC at 6 o'clock, cusp 7 /
 * Descendant at 3 o'clock, cusp 10 / MC at 12 o'clock).
 *
 * SVG convention: 0° points right (3 o'clock); positive Y is down.
 */
function wheelPoint(
  longitudeDeg: number,
  ascLongitudeDeg: number,
  cx: number,
  cy: number,
  r: number,
): readonly [number, number] {
  const astroAngle = (((longitudeDeg - ascLongitudeDeg) % 360) + 360) % 360;
  const svgAngle = (180 - astroAngle + 360) % 360;
  const rad = (svgAngle * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const;
}

/** Spread planets that occupy nearly the same longitude onto stacked radii */
function spreadConjunctions(planets: PlanetPosition[], orbDeg = 6): Array<PlanetPosition & { stack: number }> {
  // Sort by longitude. For each planet, count how many neighbours within
  // `orbDeg` already have stack=k; assign the next free k.
  const sorted = [...planets].sort((a, b) => a.longitude_deg - b.longitude_deg);
  const out: Array<PlanetPosition & { stack: number }> = [];
  for (const p of sorted) {
    const occupied = new Set(
      out
        .filter((q) => Math.abs(((p.longitude_deg - q.longitude_deg + 540) % 360) - 180) > 180 - orbDeg)
        .map((q) => q.stack),
    );
    let stack = 0;
    while (occupied.has(stack)) stack++;
    out.push({ ...p, stack });
  }
  return out;
}

export interface ChartWheelProps {
  size?: number;
  spinning?: boolean;
  className?: string;
  chart?: NatalResponse | null;
}

export function ChartWheel({ size = 260, spinning = false, className, chart }: ChartWheelProps) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 6;
  const Rsign = R * 0.84;     // inner edge of zodiac ring
  const Rhouse = R * 0.66;    // inner edge of house ring (where house numbers sit)
  const Rcore = R * 0.18;     // central core radius
  const Rplanet = R * 0.50;   // base radius for planet glyphs
  const stackStep = R * 0.075; // radius offset for stacked conjunct planets

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={cn(spinning && "chart-rotate", className)}
      role="img"
      aria-label={chart ? "Natal chart wheel" : "Astrology chart wheel"}
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

      {/* concentric rings */}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="url(#cw-ring)" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={Rsign} fill="none" stroke="var(--color-brand-gold)" strokeWidth="0.7" opacity="0.6" />
      <circle cx={cx} cy={cy} r={Rhouse} fill="none" stroke="var(--color-brand-gold)" strokeWidth="0.7" opacity="0.4" />
      <circle cx={cx} cy={cy} r={Rcore} fill="url(#cw-core)" />

      {chart ? (
        <RealWheel
          chart={chart}
          cx={cx}
          cy={cy}
          R={R}
          Rsign={Rsign}
          Rhouse={Rhouse}
          Rcore={Rcore}
          Rplanet={Rplanet}
          stackStep={stackStep}
          size={size}
        />
      ) : (
        <DecorativeWheel
          cx={cx}
          cy={cy}
          R={R}
          Rsign={Rsign}
          Rhouse={Rhouse}
          Rcore={Rcore}
          size={size}
        />
      )}
    </svg>
  );
}

function DecorativeWheel({
  cx,
  cy,
  R,
  Rsign,
  Rhouse,
  Rcore,
  size,
}: {
  cx: number;
  cy: number;
  R: number;
  Rsign: number;
  Rhouse: number;
  Rcore: number;
  size: number;
}) {
  const pol = (r: number, deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const;
  };
  return (
    <>
      {/* 12 evenly-spaced spokes */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = i * 30;
        const [x1, y1] = pol(Rcore, a);
        const [x2, y2] = pol(R, a);
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-brand-gold)" strokeOpacity="0.55" strokeWidth="0.7" />
        );
      })}
      {SIGN_GLYPHS.map((g, i) => {
        const a = i * 30 + 15;
        const r = (R + Rsign) / 2;
        const [x, y] = pol(r, a);
        return (
          <text key={g} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.045} fill="var(--color-brand-gold)" opacity="0.85">
            {g}
          </text>
        );
      })}
      {DECOR_PLANETS.map((p, i) => {
        const r = Rhouse * (0.55 + (i % 3) * 0.12);
        const [x, y] = pol(r, p.a);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={size * 0.038} fill="var(--color-card)" stroke="var(--color-brand-gold)" strokeWidth="0.7" />
            <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.05} fill="var(--color-brand-gold)" fontWeight="600">
              {p.glyph}
            </text>
          </g>
        );
      })}
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={size * 0.10} fill="var(--color-brand-gold)" opacity="0.45">
        ♈
      </text>
    </>
  );
}

function RealWheel({
  chart,
  cx,
  cy,
  R,
  Rsign,
  Rhouse,
  Rcore,
  Rplanet,
  stackStep,
  size,
}: {
  chart: NatalResponse;
  cx: number;
  cy: number;
  R: number;
  Rsign: number;
  Rhouse: number;
  Rcore: number;
  Rplanet: number;
  stackStep: number;
  size: number;
}) {
  const asc = chart.ascendant_deg;

  // 12 zodiac sign sectors — boundaries are at longitudes 0, 30, 60, …, 330.
  const signBoundaries = Array.from({ length: 12 }, (_, i) => i * 30);
  // 12 house cusps from chart.houses[0..11].
  const houseCusps = chart.houses;

  const planetsStacked = spreadConjunctions(chart.planets);

  return (
    <>
      {/* Sign-boundary tick marks (every 30°) */}
      {signBoundaries.map((deg) => {
        const [x1, y1] = wheelPoint(deg, asc, cx, cy, Rsign);
        const [x2, y2] = wheelPoint(deg, asc, cx, cy, R);
        return (
          <line
            key={`sb-${deg}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="var(--color-brand-gold)"
            strokeOpacity="0.55"
            strokeWidth="0.7"
          />
        );
      })}

      {/* Sign glyphs centred in each 30° sector */}
      {SIGN_GLYPHS.map((g, i) => {
        const midDeg = i * 30 + 15;
        const r = (R + Rsign) / 2;
        const [x, y] = wheelPoint(midDeg, asc, cx, cy, r);
        return (
          <text
            key={g}
            x={x}
            y={y}
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

      {/* House cusps — line from inner core to inner edge of zodiac ring.
          Asc and MC drawn thicker / different colour. */}
      {houseCusps.map((deg, i) => {
        const isAxis = i === 0 || i === 9; // 1H = Asc, 10H = MC (cusp idx 9)
        const [x1, y1] = wheelPoint(deg, asc, cx, cy, Rcore);
        const [x2, y2] = wheelPoint(deg, asc, cx, cy, Rsign);
        return (
          <line
            key={`hc-${i}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={isAxis ? "var(--color-brand-aqua)" : "var(--color-brand-gold)"}
            strokeOpacity={isAxis ? 0.95 : 0.45}
            strokeWidth={isAxis ? 1.4 : 0.7}
          />
        );
      })}

      {/* House numbers — placed at midpoint of each house */}
      {houseCusps.map((deg, i) => {
        const next = houseCusps[(i + 1) % 12];
        // mid longitude (handle wrap-around 360)
        let mid = (deg + next) / 2;
        if (next < deg) mid = ((deg + next + 360) / 2) % 360;
        const [x, y] = wheelPoint(mid, asc, cx, cy, Rhouse * 0.96);
        return (
          <text
            key={`hn-${i}`}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={size * 0.028}
            fill="var(--color-brand-gold)"
            opacity="0.55"
          >
            {i + 1}
          </text>
        );
      })}

      {/* Planet glyphs */}
      {planetsStacked.map((p) => {
        const r = Rplanet - p.stack * stackStep;
        const [x, y] = wheelPoint(p.longitude_deg, asc, cx, cy, r);
        const glyph = PLANET_GLYPHS[p.name] ?? p.name[0];
        const retro = p.speed_deg_per_day < 0;
        return (
          <g key={p.name}>
            <circle
              cx={x}
              cy={y}
              r={size * 0.038}
              fill="var(--color-card)"
              stroke="var(--color-brand-gold)"
              strokeWidth="0.7"
            />
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={size * 0.05}
              fill="var(--color-brand-gold)"
              fontWeight="600"
            >
              {glyph}
            </text>
            {retro ? (
              <text
                x={x + size * 0.04}
                y={y - size * 0.025}
                textAnchor="start"
                dominantBaseline="central"
                fontSize={size * 0.022}
                fill="var(--color-brand-rose)"
              >
                ℞
              </text>
            ) : null}
          </g>
        );
      })}

      {/* Asc indicator: small label on the left edge */}
      <text
        x={cx - R - 2}
        y={cy}
        textAnchor="end"
        dominantBaseline="central"
        fontSize={size * 0.03}
        fill="var(--color-brand-aqua)"
        opacity="0.85"
      >
        Asc
      </text>
      <text
        x={cx}
        y={cy - R - 4}
        textAnchor="middle"
        dominantBaseline="alphabetic"
        fontSize={size * 0.03}
        fill="var(--color-brand-aqua)"
        opacity="0.85"
      >
        MC
      </text>

      {/* Centre rising-sign glyph */}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size * 0.10}
        fill="var(--color-brand-gold)"
        opacity="0.45"
      >
        {SIGN_GLYPHS[Math.floor((((asc % 360) + 360) % 360) / 30)]}
      </text>
    </>
  );
}
