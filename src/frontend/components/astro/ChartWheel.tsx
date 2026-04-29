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
  // Real chart data → Bengali (East Indian) square chart with fixed signs.
  // No chart data → decorative circular wheel (used on landing pages).
  if (chart) {
    return <BengaliChart chart={chart} size={size} className={className} />;
  }

  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 6;
  const Rsign = R * 0.84;
  const Rhouse = R * 0.66;
  const Rcore = R * 0.18;

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

      <circle cx={cx} cy={cy} r={R} fill="none" stroke="url(#cw-ring)" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={Rsign} fill="none" stroke="var(--color-brand-gold)" strokeWidth="0.7" opacity="0.6" />
      <circle cx={cx} cy={cy} r={Rhouse} fill="none" stroke="var(--color-brand-gold)" strokeWidth="0.7" opacity="0.4" />
      <circle cx={cx} cy={cy} r={Rcore} fill="url(#cw-core)" />

      <DecorativeWheel
        cx={cx}
        cy={cy}
        R={R}
        Rsign={Rsign}
        Rhouse={Rhouse}
        Rcore={Rcore}
        size={size}
      />
    </svg>
  );
}

const SIGN_SHORT = ["Ar", "Ta", "Ge", "Cn", "Le", "Vi", "Li", "Sc", "Sg", "Cp", "Aq", "Pi"];

/**
 * Bengali / East Indian square chart.
 *
 *   Layout: outer square + 3×3 internal grid + four corner diagonals
 *   running from the chart's outer corners to the inner cell corners.
 *   That gives 4 corner triangles (×2 = 8) + 4 mid-edge rectangles
 *   + 1 centre square = 12 sign cells (centre reserved for chart info).
 *
 *   Signs are FIXED in the layout. Houses rotate based on the Ascendant:
 *   the Lagna sign cell becomes H1, signs run zodiac order from there.
 *
 *   Going clockwise from the top-middle rectangle:
 *     Aries (top-mid), Taurus (NE upper), Gemini (NE lower),
 *     Cancer (right-mid), Leo (SE upper), Virgo (SE lower),
 *     Libra (bottom-mid), Scorpio (SW lower), Sagittarius (SW upper),
 *     Capricorn (left-mid), Aquarius (NW lower), Pisces (NW upper).
 *
 *   We use whole-sign for *display* even when the underlying chart used
 *   Placidus cusps — every East Indian / Bengali astrologer reads it this way.
 */
function BengaliChart({ chart, size, className }: { chart: NatalResponse; size: number; className?: string }) {
  const W = size;
  const ascSignIdx = Math.floor((((chart.ascendant_deg % 360) + 360) % 360) / 30);

  // Sign polygons in normalized (0..1) coords, indexed by signIdx (0=Aries..11=Pisces).
  const T = 1 / 3;
  const T2 = 2 / 3;
  const SIGN_POLY: Array<Array<[number, number]>> = [
    /* 0  Aries        top-mid        */ [[T, 0],   [T2, 0],  [T2, T],  [T, T]],
    /* 1  Taurus       NE upper tri   */ [[T2, 0],  [1, 0],   [T2, T]],
    /* 2  Gemini       NE lower tri   */ [[1, 0],   [1, T],   [T2, T]],
    /* 3  Cancer       right-mid      */ [[T2, T],  [1, T],   [1, T2],  [T2, T2]],
    /* 4  Leo          SE upper tri   */ [[1, T2],  [1, 1],   [T2, T2]],
    /* 5  Virgo        SE lower tri   */ [[T2, 1],  [1, 1],   [T2, T2]],
    /* 6  Libra        bottom-mid     */ [[T, T2],  [T2, T2], [T2, 1],  [T, 1]],
    /* 7  Scorpio      SW lower tri   */ [[0, 1],   [T, 1],   [T, T2]],
    /* 8  Sagittarius  SW upper tri   */ [[0, T2],  [0, 1],   [T, T2]],
    /* 9  Capricorn    left-mid       */ [[0, T],   [T, T],   [T, T2],  [0, T2]],
    /* 10 Aquarius     NW lower tri   */ [[0, 0],   [0, T],   [T, T]],
    /* 11 Pisces       NW upper tri   */ [[0, 0],   [T, 0],   [T, T]],
  ];

  // Group planets by sign (0..11). Signs are fixed; houses are derived from Lagna.
  const planetsBySign = new Map<number, PlanetPosition[]>();
  for (const p of chart.planets) {
    const signIdx = Math.floor((((p.longitude_deg % 360) + 360) % 360) / 30);
    const arr = planetsBySign.get(signIdx) ?? [];
    arr.push(p);
    planetsBySign.set(signIdx, arr);
  }

  const centroid = (poly: Array<[number, number]>): [number, number] => {
    const sx = poly.reduce((s, [x]) => s + x, 0) / poly.length;
    const sy = poly.reduce((s, [, y]) => s + y, 0) / poly.length;
    return [sx * W, sy * W];
  };

  const M = 2; // outer-rect inset (matches stroke buffer)

  return (
    <svg
      viewBox={`0 0 ${W} ${W}`}
      width={W}
      height={W}
      className={className}
      role="img"
      aria-label="Bengali natal chart (East Indian style)"
    >
      <defs>
        <linearGradient id="bg-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-brand-gold)" />
          <stop offset="100%" stopColor="#d4a93a" />
        </linearGradient>
      </defs>

      {/* Outer square */}
      <rect x={M} y={M} width={W - 2 * M} height={W - 2 * M} fill="none" stroke="url(#bg-ring)" strokeWidth="1.5" />

      {/* 3×3 grid lines */}
      <line x1={T * W}  y1={M}      x2={T * W}  y2={W - M}  stroke="var(--color-brand-gold)" strokeOpacity="0.7" strokeWidth="0.8" />
      <line x1={T2 * W} y1={M}      x2={T2 * W} y2={W - M}  stroke="var(--color-brand-gold)" strokeOpacity="0.7" strokeWidth="0.8" />
      <line x1={M}      y1={T * W}  x2={W - M}  y2={T * W}  stroke="var(--color-brand-gold)" strokeOpacity="0.7" strokeWidth="0.8" />
      <line x1={M}      y1={T2 * W} x2={W - M}  y2={T2 * W} stroke="var(--color-brand-gold)" strokeOpacity="0.7" strokeWidth="0.8" />

      {/* Corner diagonals — outer corner of chart → inner corner of corner cell */}
      <line x1={M}     y1={M}     x2={T * W}  y2={T * W}  stroke="var(--color-brand-gold)" strokeOpacity="0.7" strokeWidth="0.8" />
      <line x1={W - M} y1={M}     x2={T2 * W} y2={T * W}  stroke="var(--color-brand-gold)" strokeOpacity="0.7" strokeWidth="0.8" />
      <line x1={W - M} y1={W - M} x2={T2 * W} y2={T2 * W} stroke="var(--color-brand-gold)" strokeOpacity="0.7" strokeWidth="0.8" />
      <line x1={M}     y1={W - M} x2={T * W}  y2={T2 * W} stroke="var(--color-brand-gold)" strokeOpacity="0.7" strokeWidth="0.8" />

      {SIGN_POLY.map((poly, signIdx) => {
        const [cxP, cyP] = centroid(poly);
        const planets = planetsBySign.get(signIdx) ?? [];
        const houseNum = ((signIdx - ascSignIdx + 12) % 12) + 1;
        const isLagna = signIdx === ascSignIdx;

        return (
          <g key={`s-${signIdx}`}>
            {/* Sign abbreviation, top of cell */}
            <text
              x={cxP}
              y={cyP - W * 0.05}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={W * 0.028}
              fill="var(--color-brand-aqua)"
              opacity="0.8"
            >
              {SIGN_SHORT[signIdx]}
            </text>

            {/* Planets, centred, stacked vertically */}
            {planets.map((p, j) => {
              const total = planets.length;
              const dy = (j - (total - 1) / 2) * W * 0.034;
              const glyph = PLANET_GLYPHS[p.name] ?? p.name[0];
              const retro = p.speed_deg_per_day < 0;
              return (
                <text
                  key={p.name}
                  x={cxP}
                  y={cyP + dy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={W * 0.032}
                  fill="var(--color-brand-gold)"
                  fontWeight="600"
                >
                  {glyph}
                  {retro ? <tspan fill="var(--color-brand-rose)" fontSize={W * 0.02}> ℞</tspan> : null}
                </text>
              );
            })}

            {/* House number — small, bottom of cell */}
            <text
              x={cxP}
              y={cyP + W * 0.055}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={W * 0.022}
              fill="var(--color-brand-gold)"
              opacity={isLagna ? 0.95 : 0.45}
              fontWeight={isLagna ? 700 : 400}
            >
              {isLagna ? `H${houseNum} • Lagna` : houseNum}
            </text>
          </g>
        );
      })}

      {/* Centre square — chart label */}
      <text
        x={W / 2}
        y={W / 2 - W * 0.018}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={W * 0.03}
        fill="var(--color-brand-aqua)"
        opacity="0.55"
      >
        Lagna
      </text>
      <text
        x={W / 2}
        y={W / 2 + W * 0.022}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={W * 0.034}
        fill="var(--color-brand-aqua)"
        opacity="0.85"
        fontWeight="600"
      >
        {SIGN_SHORT[ascSignIdx]}
      </text>
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
