/**
 * Minimal RFC-4180 CSV writer. No deps, no streaming — caller is responsible
 * for keeping the row count bounded.
 */

export type CsvCell = string | number | boolean | null | undefined | Date;

function escapeCell(v: CsvCell): string {
  if (v === null || v === undefined) return "";
  let s: string;
  if (v instanceof Date) s = v.toISOString();
  else if (typeof v === "boolean") s = v ? "true" : "false";
  else s = String(v);
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines: string[] = [];
  lines.push(headers.map((h) => escapeCell(h)).join(","));
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(","));
  }
  // RFC 4180 says CRLF; most consumers accept LF too. Use LF for smaller payload.
  return lines.join("\n");
}
