import type { SurfaceId } from "./logger";

const DISCLAIMER = "_For self-reflection and entertainment, not medical, legal, or financial advice._";

const SOFTENER = "\n\nI can offer perspective here, but for medical, legal, or financial decisions please consult a qualified professional.";

const SURFACES_NEEDING_DISCLAIMER: ReadonlyArray<SurfaceId> = [
  "HOROSCOPE_DAILY",
  "HOROSCOPE_WEEKLY",
  "HOROSCOPE_MONTHLY",
  "HOROSCOPE_YEARLY",
  "REPORT",
];

/**
 * Append a one-line entertainment disclaimer to a prediction or report.
 * Skipped for CHAT (already conversational, repeats annoy) and
 * COMPATIBILITY (already non-prescriptive). Idempotent — re-appending the
 * same footer is a no-op so callers don't have to track state.
 */
export function appendDisclaimer(text: string, surface: SurfaceId | string): string {
  if (!SURFACES_NEEDING_DISCLAIMER.includes(surface as SurfaceId)) return text;
  if (text.includes(DISCLAIMER)) return text;
  const trimmed = text.trimEnd();
  return `${trimmed}\n\n${DISCLAIMER}`;
}

interface UnsafeRule {
  /** Lowercase regex tested against the lowercased output. */
  pattern: RegExp;
  reason: string;
}

const RULES: UnsafeRule[] = [
  // Medical-advice patterns
  { pattern: /\byou (have|likely have|are diagnosed with|are showing signs of)\s+(a\s+)?(heart|kidney|liver|cancer|diabetes|depression|anxiety disorder|adhd|bipolar)\b/, reason: "medical_diagnosis" },
  { pattern: /\b(stop|discontinue|skip)\s+(your\s+)?(medication|prescription|treatment)\b/, reason: "medical_stop_treatment" },
  { pattern: /\b(take|use)\s+\d+\s*(mg|grams|tablets|pills)\b/, reason: "medical_dosage" },
  // Legal-advice patterns
  { pattern: /\byou should sue\b/, reason: "legal_litigation" },
  { pattern: /\byou (will|should|must)\s+win (your|the)\s+(case|lawsuit|trial)\b/, reason: "legal_outcome_promise" },
  // Financial-advice patterns
  { pattern: /\b(buy|sell|short)\s+(stock|stocks|shares|crypto|bitcoin|ethereum|tesla|apple|nvidia)\b/, reason: "financial_security_advice" },
  { pattern: /\binvest\s+(in|all)\s+(this|that|specific)\b/, reason: "financial_specific_recommendation" },
  { pattern: /\bguaranteed (returns|profit|gain)\b/, reason: "financial_guarantee" },
  // Catch-all generic medical diagnosis phrasing
  { pattern: /\bmedical diagnosis\b/, reason: "medical_diagnosis" },
];

export interface FlagResult {
  flagged: boolean;
  reasons: string[];
}

/**
 * Scan an LLM output for prescriptive medical/legal/financial language.
 * Caller decides what to do with a flagged result — default behaviour
 * (per the AI-infra spec) is to log + soften, not to replace the entire
 * output.
 */
export function flagUnsafeOutput(text: string): FlagResult {
  const lower = text.toLowerCase();
  const reasons = new Set<string>();
  for (const rule of RULES) {
    if (rule.pattern.test(lower)) reasons.add(rule.reason);
  }
  return { flagged: reasons.size > 0, reasons: [...reasons] };
}

/**
 * Append a softener line to flagged output. Non-destructive: never edits
 * the model's text mid-stream, only adds a clarifier paragraph at the end.
 */
export function softenFlaggedOutput(text: string): string {
  if (text.includes(SOFTENER.trim())) return text;
  return `${text.trimEnd()}${SOFTENER}`;
}
