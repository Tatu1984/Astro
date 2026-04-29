// Shared chat types — used by Next.js server, Next.js web client, and the
// upcoming React Native mobile client.
//
// SSE contract (mobile + web)
// ---------------------------
// URL:        POST /api/chat/sessions/:id/messages/stream
// Auth:       Authorization: Bearer <jwt>  (mobile)
//             OR NextAuth cookie session  (web)
// Request:    application/json  { content: string }   (1..4000 chars)
// Response:   text/event-stream
//   - Each event is a single SSE record terminated by "\n\n".
//   - One "data: <json>\n" line per record. The JSON body is a
//     ChatStreamEvent (discriminated by the `kind` field).
//   - Order: zero or more `delta` events, then exactly one terminal event
//     which is either `done` (success) or `error` (failure).
//   - `delta.text` is an additive token slice; concatenate them in
//     receive order to reconstruct the assistant message.
//   - On `done`, `messageId` is the persisted assistant message row id;
//     fetch the full row via GET /api/chat/sessions/:id if needed.
//
// Note: server emits both `kind` (canonical) and `type` (legacy) fields
// during the migration window; new clients should rely on `kind`.

export type ChatStreamDelta = {
  kind: "delta";
  type?: "chunk"; // legacy
  text: string;
};

export type ChatStreamDone = {
  kind: "done";
  type?: "done"; // legacy
  messageId: string;
  // Legacy-only echo of full persisted message rows (kept for current
  // web client; mobile should ignore and fetch as needed).
  userMessage?: unknown;
  assistantMessage?: unknown;
};

export type ChatStreamError = {
  kind: "error";
  type?: "error"; // legacy
  message: string;
  // Legacy-only alias for `message`.
  error?: string;
};

// Tool-call event — emitted when the assistant suggests a UI action.
// Args are unstructured by design so each tool can validate its own shape
// on the client. See backend/services/llm/tools.ts for the registry.
export type ChatStreamToolCall = {
  kind: "tool_call";
  name:
    | "show_chart"
    | "show_compatibility"
    | "show_transit_today"
    | "show_predictions"
    | "navigate";
  args: Record<string, unknown>;
  href: string | null;
};

export type ChatStreamEvent =
  | ChatStreamDelta
  | ChatStreamDone
  | ChatStreamError
  | ChatStreamToolCall;
