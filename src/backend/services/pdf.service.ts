import { Document, Page, Text, View, StyleSheet, Svg, Line, Rect, G, Path } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";

import type { Report } from "@prisma/client";

import type { NatalResponse, PlanetPosition } from "@/shared/types/chart";

// =========================================================
// Styles
// =========================================================

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 11,
    lineHeight: 1.5,
    fontFamily: "Helvetica",
    color: "#222",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#3b2a5e",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#777",
    marginBottom: 18,
  },
  h1: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#3b2a5e",
    marginTop: 16,
    marginBottom: 6,
  },
  h2: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#222",
    marginTop: 12,
    marginBottom: 4,
  },
  h3: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#3b2a5e",
    marginTop: 8,
    marginBottom: 2,
  },
  body: {
    fontSize: 11,
    marginBottom: 6,
  },
  small: {
    fontSize: 9,
    color: "#666",
  },
  tocItem: {
    flexDirection: "row",
    fontSize: 11,
    marginBottom: 2,
  },
  tocBullet: { width: 18, color: "#888" },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#ddd", paddingVertical: 4 },
  tableCellName: { width: "30%", fontSize: 10 },
  tableCellSign: { width: "30%", fontSize: 10, color: "#444" },
  tableCellDeg: { width: "20%", fontSize: 10, color: "#444" },
  tableCellHouse: { width: "20%", fontSize: 10, color: "#666", textAlign: "right" },
  hr: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    marginVertical: 8,
  },
  footer: {
    position: "absolute",
    fontSize: 8,
    bottom: 24,
    left: 48,
    right: 48,
    color: "#999",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

// =========================================================
// Markdown -> AST (very minimal, just enough for Report bodies)
// =========================================================

interface MdNode {
  kind: "h1" | "h2" | "h3" | "p" | "li" | "blank";
  text: string;
}

function parseMarkdown(md: string): MdNode[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: MdNode[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      out.push({ kind: "blank", text: "" });
      continue;
    }
    if (t.startsWith("### ")) out.push({ kind: "h3", text: t.slice(4) });
    else if (t.startsWith("## ")) out.push({ kind: "h2", text: t.slice(3) });
    else if (t.startsWith("# ")) out.push({ kind: "h1", text: t.slice(2) });
    else if (/^[-*]\s+/.test(t)) out.push({ kind: "li", text: t.replace(/^[-*]\s+/, "") });
    else out.push({ kind: "p", text: t });
  }
  return out;
}

function pickToc(nodes: MdNode[]): string[] {
  const toc: string[] = [];
  for (const n of nodes) {
    if (n.kind === "h1" || n.kind === "h2") toc.push(n.text);
  }
  return toc;
}

// =========================================================
// Report PDF
// =========================================================

interface ReportPdfInput {
  report: Pick<Report, "id" | "title" | "kind" | "bodyMarkdown" | "createdAt">;
  ownerName: string | null;
}

export async function renderReportPdfBuffer(input: ReportPdfInput): Promise<Buffer> {
  const nodes = parseMarkdown(input.report.bodyMarkdown);
  const toc = pickToc(nodes);
  const generated = new Date(input.report.createdAt).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const doc = createElement(
    Document,
    null,
    createElement(
      Page,
      { size: "A4", style: styles.page },
      createElement(Text, { style: styles.title }, input.report.title),
      createElement(
        Text,
        { style: styles.subtitle },
        `${input.report.kind.replaceAll("_", " ")} · prepared for ${input.ownerName ?? "—"} · ${generated}`,
      ),
      createElement(View, { style: styles.hr }),
      // TOC
      ...(toc.length > 0
        ? [
            createElement(Text, { style: styles.h1 }, "Contents"),
            ...toc.map((t, i) =>
              createElement(
                View,
                { key: `toc-${i}`, style: styles.tocItem },
                createElement(Text, { style: styles.tocBullet }, `${i + 1}.`),
                createElement(Text, null, t),
              ),
            ),
            createElement(View, { style: styles.hr }),
          ]
        : []),
      // Body
      ...nodes.map((n, i) => {
        const key = `n-${i}`;
        if (n.kind === "h1") return createElement(Text, { key, style: styles.h1 }, n.text);
        if (n.kind === "h2") return createElement(Text, { key, style: styles.h2 }, n.text);
        if (n.kind === "h3") return createElement(Text, { key, style: styles.h3 }, n.text);
        if (n.kind === "li") return createElement(Text, { key, style: styles.body }, `• ${n.text}`);
        if (n.kind === "blank") return createElement(View, { key, style: { height: 4 } });
        return createElement(Text, { key, style: styles.body }, n.text);
      }),
      createElement(
        View,
        { style: styles.footer, fixed: true },
        createElement(Text, null, "Astro · generated by your account"),
        createElement(Text, null, `Report ${input.report.id.slice(0, 10)}`),
      ),
    ),
  );

  return renderToBuffer(doc);
}

// =========================================================
// Chart PDF — East Indian wheel + planet table
// =========================================================

const SIGN_GLYPHS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

const PLANET_GLYPHS: Record<string, string> = {
  Sun: "Sun",
  Moon: "Moon",
  Mercury: "Mercury",
  Venus: "Venus",
  Mars: "Mars",
  Jupiter: "Jupiter",
  Saturn: "Saturn",
  Uranus: "Uranus",
  Neptune: "Neptune",
  Pluto: "Pluto",
};

// East-Indian (Bengali) chart geometry: square outer, four diagonals from
// midpoints to corners, with 12 fixed-sign cells. The mapping below
// corresponds to the same layout used by ChartWheel.tsx so the PDF chart
// reads identically. Sign indices use Aries=0..Pisces=11.
//
// Cell anchors are (x, y, width, height) in SVG units. The outer box is
// 360 px wide; cells average ~120 px square but the diagonals cut off
// the corner triangles (rendered as <path>).
interface CellSpec {
  signIdx: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

function bengaliCells(size: number): CellSpec[] {
  // 4x4 grid where corners are split. We approximate by laying out 12
  // labelled tiles in a 4x4 layout (skipping centre cells), which is the
  // simplest layout that still reads as Bengali.
  const s = size;
  const c = s / 4; // cell side
  // Sign assignment matches the convention used by ChartWheel.tsx
  // (Pisces top-left, then clockwise).
  const cells: CellSpec[] = [
    { signIdx: 11, x: 0, y: 0, w: c, h: c }, // Pisces
    { signIdx: 0, x: c, y: 0, w: c, h: c }, // Aries
    { signIdx: 1, x: 2 * c, y: 0, w: c, h: c }, // Taurus
    { signIdx: 2, x: 3 * c, y: 0, w: c, h: c }, // Gemini
    { signIdx: 10, x: 0, y: c, w: c, h: c }, // Aquarius
    { signIdx: 3, x: 3 * c, y: c, w: c, h: c }, // Cancer
    { signIdx: 9, x: 0, y: 2 * c, w: c, h: c }, // Capricorn
    { signIdx: 4, x: 3 * c, y: 2 * c, w: c, h: c }, // Leo
    { signIdx: 8, x: 0, y: 3 * c, w: c, h: c }, // Sagittarius
    { signIdx: 7, x: c, y: 3 * c, w: c, h: c }, // Scorpio
    { signIdx: 6, x: 2 * c, y: 3 * c, w: c, h: c }, // Libra
    { signIdx: 5, x: 3 * c, y: 3 * c, w: c, h: c }, // Virgo
  ];
  return cells;
}

interface ChartPdfInput {
  chart: NatalResponse;
  ownerName: string | null;
  birthPlace: string | null;
}

function bucketPlanetsBySign(planets: PlanetPosition[]): Record<number, PlanetPosition[]> {
  const map: Record<number, PlanetPosition[]> = {};
  for (const p of planets) {
    const idx = Math.floor((((p.longitude_deg % 360) + 360) % 360) / 30);
    if (!map[idx]) map[idx] = [];
    map[idx].push(p);
  }
  return map;
}

export async function renderChartPdfBuffer(input: ChartPdfInput): Promise<Buffer> {
  const wheelSize = 360;
  const cells = bengaliCells(wheelSize);
  const buckets = bucketPlanetsBySign(input.chart.planets);
  const ascSignIdx = Math.floor((((input.chart.ascendant_deg % 360) + 360) % 360) / 30);

  const planetRows = [...input.chart.planets].sort((a, b) =>
    a.longitude_deg - b.longitude_deg,
  );

  const signLabel = (idx: number) =>
    `${["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"][idx]}`;

  const generated = new Date(input.chart.computed_at).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const doc = createElement(
    Document,
    null,
    createElement(
      Page,
      { size: "A4", style: styles.page },
      createElement(Text, { style: styles.title }, `${input.ownerName ?? "Natal"} · birth chart`),
      createElement(
        Text,
        { style: styles.subtitle },
        `${input.birthPlace ?? "—"} · ${input.chart.house_system} houses · ${input.chart.system} · ${generated}`,
      ),
      createElement(View, { style: styles.hr }),

      // Wheel SVG
      createElement(
        View,
        { style: { alignItems: "center", marginBottom: 16 } },
        createElement(
          Svg,
          { width: wheelSize, height: wheelSize, viewBox: `0 0 ${wheelSize} ${wheelSize}` },
          createElement(Rect, {
            x: 0,
            y: 0,
            width: wheelSize,
            height: wheelSize,
            fill: "#fff",
            stroke: "#3b2a5e",
            strokeWidth: 1.2,
          }),
          // Diagonals
          createElement(Line, { x1: 0, y1: 0, x2: wheelSize, y2: wheelSize, stroke: "#3b2a5e", strokeWidth: 0.6 }),
          createElement(Line, { x1: wheelSize, y1: 0, x2: 0, y2: wheelSize, stroke: "#3b2a5e", strokeWidth: 0.6 }),
          // Inner square (rotated 45deg) — approximate via path
          createElement(Path, {
            d: `M ${wheelSize / 2} 0 L ${wheelSize} ${wheelSize / 2} L ${wheelSize / 2} ${wheelSize} L 0 ${wheelSize / 2} Z`,
            fill: "transparent",
            stroke: "#3b2a5e",
            strokeWidth: 0.6,
          }),
          // Cell labels + planets
          ...cells.flatMap((cell, i) => {
            const planets = buckets[cell.signIdx] ?? [];
            const isAsc = cell.signIdx === ascSignIdx;
            const elements = [
              createElement(
                G,
                { key: `cell-${i}` },
                createElement(Text, {
                  x: cell.x + 6,
                  y: cell.y + 14,
                  style: { fontSize: 8, fill: isAsc ? "#b48f1d" : "#888" },
                }, `${SIGN_GLYPHS[cell.signIdx]} ${signLabel(cell.signIdx).slice(0, 3)}${isAsc ? " · Asc" : ""}`),
                ...planets.slice(0, 5).map((p, pi) =>
                  createElement(Text, {
                    key: `p-${i}-${pi}`,
                    x: cell.x + 6,
                    y: cell.y + 28 + pi * 11,
                    style: { fontSize: 8, fill: "#222" },
                  }, `${PLANET_GLYPHS[p.name] ?? p.name} ${(p.longitude_deg % 30).toFixed(1)}°${p.speed_deg_per_day < 0 ? " R" : ""}`),
                ),
              ),
            ];
            return elements;
          }),
        ),
      ),

      // Axes
      createElement(Text, { style: styles.h2 }, "Axes"),
      createElement(
        View,
        { style: { flexDirection: "row", marginBottom: 6 } },
        createElement(Text, { style: { width: "50%", fontSize: 10 } },
          `Ascendant: ${signLabel(ascSignIdx)} ${(input.chart.ascendant_deg % 30).toFixed(2)}°`),
        createElement(Text, { style: { width: "50%", fontSize: 10 } },
          `Midheaven: ${signLabel(Math.floor((((input.chart.midheaven_deg % 360) + 360) % 360) / 30))} ${(input.chart.midheaven_deg % 30).toFixed(2)}°`),
      ),

      // Planet table
      createElement(Text, { style: styles.h2 }, "Planets"),
      createElement(
        View,
        { style: styles.tableRow },
        createElement(Text, { style: { ...styles.tableCellName, fontWeight: "bold" } }, "Planet"),
        createElement(Text, { style: { ...styles.tableCellSign, fontWeight: "bold" } }, "Sign"),
        createElement(Text, { style: { ...styles.tableCellDeg, fontWeight: "bold" } }, "Degree"),
        createElement(Text, { style: { ...styles.tableCellHouse, fontWeight: "bold" } }, "House"),
      ),
      ...planetRows.map((p, i) =>
        createElement(
          View,
          { key: `r-${i}`, style: styles.tableRow },
          createElement(Text, { style: styles.tableCellName }, `${p.name}${p.speed_deg_per_day < 0 ? " ℞" : ""}`),
          createElement(Text, { style: styles.tableCellSign }, `${p.sign}`),
          createElement(Text, { style: styles.tableCellDeg }, `${(p.longitude_deg % 30).toFixed(2)}°`),
          createElement(Text, { style: styles.tableCellHouse }, p.house ? `H${p.house}` : "—"),
        ),
      ),

      createElement(
        View,
        { style: styles.footer, fixed: true },
        createElement(Text, null, "Astro · birth chart"),
        createElement(Text, null, `Hash ${input.chart.input_hash.slice(0, 10)}`),
      ),
    ),
  );

  return renderToBuffer(doc);
}
