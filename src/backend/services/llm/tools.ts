// Tool-call registry for the AI chat surface.
//
// The model emits a single ASCII-delimited line in its output — `[[TOOL: <name> <json-args>]]`
// — when it wants to suggest a UI action. The chat SSE pipeline parses that
// line out of the stream and emits a separate `tool_call` event so the UI
// can render an action button. The textual delta stream still gets the
// surrounding prose; only the `[[TOOL: ...]]` block itself is stripped.

export const TOOL_NAMES = [
  "show_chart",
  "show_compatibility",
  "show_transit_today",
  "show_predictions",
  "navigate",
] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

export interface ToolCall {
  name: ToolName;
  args: Record<string, unknown>;
}

export interface ToolDescription {
  name: ToolName;
  hint: string;
  argsHint: string;
}

export const TOOL_REGISTRY: ToolDescription[] = [
  {
    name: "show_chart",
    hint: "Open the user's chart workspace.",
    argsHint: '{ "profileId"?: string }',
  },
  {
    name: "show_compatibility",
    hint: "Open compatibility between two profiles.",
    argsHint: '{ "profileAId"?: string, "profileBId"?: string }',
  },
  {
    name: "show_transit_today",
    hint: "Open today's transit calendar.",
    argsHint: "{}",
  },
  {
    name: "show_predictions",
    hint: "Open the predictions page.",
    argsHint: '{ "kind"?: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" }',
  },
  {
    name: "navigate",
    hint: "Navigate to an arbitrary in-app path.",
    argsHint: '{ "href": string }',
  },
];

export function toolPromptBlock(): string {
  const list = TOOL_REGISTRY.map(
    (t) => `  - ${t.name} ${t.argsHint} — ${t.hint}`,
  ).join("\n");
  return `Tool-calling: when a single follow-up UI action would help the user act on what you just said, emit ONE line on its own that looks exactly like:
[[TOOL: <name> <json-args>]]
where <name> is one of:
${list}
Keep <json-args> compact JSON on the same line. Emit AT MOST one tool call per response, and only when natural — never as a substitute for explanation. Do NOT explain the tool block; the UI will render the button. Place it as the LAST line of your reply.`;
}

const TOOL_LINE_RE = /\[\[TOOL:\s*([a-z_]+)\s*(\{.*?\})\s*\]\]/i;

export interface ToolParseResult {
  call: ToolCall | null;
  cleaned: string;
}

export function parseToolCalls(text: string): ToolParseResult {
  const m = text.match(TOOL_LINE_RE);
  if (!m) return { call: null, cleaned: text };
  const name = m[1].toLowerCase() as ToolName;
  if (!(TOOL_NAMES as readonly string[]).includes(name)) {
    return { call: null, cleaned: text };
  }
  let args: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(m[2]) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      args = parsed as Record<string, unknown>;
    }
  } catch {
    return { call: null, cleaned: text };
  }
  const cleaned = text.replace(m[0], "").replace(/\n{3,}/g, "\n\n").trimEnd();
  return { call: { name, args }, cleaned };
}

export function toolCallToHref(call: ToolCall): string | null {
  switch (call.name) {
    case "show_chart": {
      const profileId = typeof call.args.profileId === "string" ? call.args.profileId : null;
      return profileId ? `/user/chart?profile=${encodeURIComponent(profileId)}` : "/user/chart";
    }
    case "show_compatibility": {
      const a = typeof call.args.profileAId === "string" ? call.args.profileAId : null;
      const b = typeof call.args.profileBId === "string" ? call.args.profileBId : null;
      if (a && b) return `/user/compatibility?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`;
      return "/user/compatibility";
    }
    case "show_transit_today":
      return "/user/calendar";
    case "show_predictions": {
      const kind = typeof call.args.kind === "string" ? call.args.kind : null;
      return kind ? `/user/predictions?kind=${encodeURIComponent(kind)}` : "/user/predictions";
    }
    case "navigate": {
      const href = typeof call.args.href === "string" ? call.args.href : null;
      if (!href) return null;
      // Allow only same-origin in-app paths.
      if (!href.startsWith("/")) return null;
      return href;
    }
  }
}
