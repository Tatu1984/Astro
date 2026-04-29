# Mobile API contract

This is the surface the React Native client will hit. Every endpoint accepts
either a NextAuth cookie (web) or `Authorization: Bearer <jwt>` (mobile),
unless noted otherwise. JSON bodies. UTF-8.

Base URL: depends on deployment (set via `EXPO_PUBLIC_API_URL`).

## Auth

### POST `/api/auth/signup`
- Auth: none
- Body: `{ email: string, password: string (>=8), name?: string }`
- 201: `{ user: { id, email, name, role } }`
- 400 validation, 409 email-taken

### POST `/api/auth/login`
- Auth: none
- Body: `{ email, password }`
- 200: `{ token: string, user: { id, email, role, name } }` — `token` is HS256 JWT (7d)
- 400 validation, 401 invalid-credentials

### GET `/api/auth/me`
- Auth: cookie OR Bearer
- 200: `{ user: { id, email, name, role } }`
- 401

### POST `/api/auth/refresh`
- Auth: Bearer **only** (cookie path returns 401)
- Body: empty
- 200: `{ token: string }` — new 7d JWT
- 401 invalid/expired

## Profiles

### GET `/api/profiles`
- Auth: cookie OR Bearer
- 200: `{ profiles: Profile[] }`

### POST `/api/profiles`
- Auth: cookie OR Bearer
- Body: `{ kind: SELF|PARTNER|CHILD|FRIEND|CELEBRITY|OTHER, fullName, birthDate "YYYY-MM-DD", birthTime? "HH:MM", unknownTime: bool, birthPlace, latitude, longitude, timezone, gender?, notes?, isPrivate? }`
- 201: `{ profile: Profile }`
- 400 validation, 409 duplicate

### DELETE `/api/profiles/:id`
- Auth: cookie OR Bearer
- 200: `{ ok: true }` (soft delete)
- 403 forbidden, 404 not-found

## Charts

### POST `/api/charts/natal`
- Auth: cookie OR Bearer
- Body: `{ profile_id?, birth_datetime_utc ISO, latitude, longitude, house_system?, system?, unknown_time? }`
- 200: `{ chart: NatalResponse, cached: boolean }`
- 400, 502 compute-error

### GET `/api/charts/vedic?profileId=...`
- Auth: cookie OR Bearer
- 200: `VedicResponse`
- 400 missing-profileId

## Horoscopes

### GET `/api/horoscopes/:kind?profileId=...`
- Auth: cookie OR Bearer
- `kind`: `daily | weekly | monthly | yearly` (case-insensitive)
- 200: `{ kind, cached, payload: { headline, body, domains: { career, love, health (each: { score, body }) } }, generatedAt, provider, model }`
- 400, 404, 502 llm-error

## Transits

### GET `/api/transits/now?profileId=...`
- Auth: cookie OR Bearer
- 200: `{ moment, topAspects: TransitAspect[], transit: TransitResponse }`
- 404 no-profile

### POST `/api/transits/calendar`
- Auth: cookie OR Bearer
- Body: `{ profileId, fromDate ISO, toDate ISO, eventTypes?: ('INGRESS'|'RETRO_STATION'|'ASPECT_EXACT')[] }`
- Range cap: 90 days (else 422)
- 200: `{ events: CalendarEvent[] }` where `CalendarEvent = { type, date, planet, severity 1|2|3, fromSign?, toSign?, station?, aspect?, natal?, natalSign?, natalHouse? }`
- 422 range-too-large, 403 forbidden, 404 profile-not-found
- Server caches by `(userId, profileId, fromDate, toDate)` for 24h.

## Chat

### GET `/api/chat/sessions`
- Auth: cookie OR Bearer
- 200: `{ sessions: ChatSession[] }`

### POST `/api/chat/sessions`
- Auth: cookie OR Bearer
- Body: empty
- 201: `{ session: ChatSession }`

### GET `/api/chat/sessions/:id`
- Auth: cookie OR Bearer
- 200: `{ session: ChatSession & { messages: ChatMessage[] } }`
- 404, 403

### GET `/api/chat/sessions/:id/messages`
Note: there is no GET on this exact path; use the session-by-id endpoint above to fetch the message list.

### POST `/api/chat/sessions/:id/messages`
- Auth: cookie OR Bearer
- Body: `{ content: string (1..4000) }`
- 201: `{ userMessage, assistantMessage }` (synchronous, full response)

### POST `/api/chat/sessions/:id/messages/stream`  (SSE)
- Auth: cookie OR Bearer (mobile must use Bearer)
- Body: `{ content: string (1..4000) }`
- Response: `text/event-stream`. Each event: `event: <kind>\ndata: <json>\n\n`.
- Event kinds (discriminator field is `kind`):
  - `delta` `{ kind: 'delta', text: string }` — token slice; concatenate
  - `done`  `{ kind: 'done', messageId: string }` — terminal success
  - `error` `{ kind: 'error', message: string }` — terminal failure
- Order: zero or more `delta` then exactly one `done` or `error`.
- Legacy `type` field is also emitted for the current web client; mobile should rely on `kind`.

## Compatibility

### POST `/api/compatibility`
- Auth: cookie OR Bearer
- Body: `{ profileAId, profileBId, kind?: ROMANTIC|FRIENDSHIP|BUSINESS|FAMILY }` (default ROMANTIC)
- 200/201: `{ compatibility, cached }`
- 502 llm-error

### GET `/api/compatibility/:id`
- Auth: cookie OR Bearer
- 200: `{ compatibility }`
- 403, 404

## Reports

### GET `/api/reports`
- Auth: cookie OR Bearer
- 200: `{ reports: Array<{ id, kind, title, createdAt, llmModel }> }`

### POST `/api/reports`
- Auth: cookie OR Bearer
- Body: `{ profileId, kind: NATAL_FULL | CAREER_WEALTH | LOVE_MARRIAGE | HEALTH | EDUCATION | SPIRITUAL }`
- 201: `{ report: Report }` (markdown body in `report.bodyMarkdown`, 800–1400 words, h2 sections)
- 502 llm-error

### GET `/api/reports/:id`
- Auth: cookie OR Bearer
- 200: `{ report: Report }`
- 403, 404

## Geocode

### GET `/api/geocode?q=<query>&multi=1?`
- Auth: cookie OR Bearer
- `multi=1` returns up to 5 autocomplete results; otherwise single best match.
- 200 single: `{ query, displayName, latitude, longitude, timezone, countryCode? }`
- 200 multi: `{ results: GeocodeResult[] }`
- 400 missing-query, 500 upstream-failed

## Common error shape

`{ error: string, details?: object, detail?: string }`. Status codes follow the
HTTP semantics noted per endpoint. 401 always means "auth missing or
invalid"; mobile should refresh-then-retry once via `/api/auth/refresh`.

## Phase 3 (web only — mobile v1 does NOT include consult)

The Phase 3 marketplace surface is intentionally web-only for mobile v1. The
following routes are out of scope for the React Native client and should not
be wired up in mobile until a dedicated mobile-consult phase ships:

- `/api/consult/*` — astrologer directory, public profile, user bookings,
  join, cancel, review.
- `/api/astrologer/*` — services, schedule, schedule exceptions, bookings,
  start/complete, earnings, reviews, payouts. (Astrologers operate from web.)
- `/api/admin/payouts*` and `/api/admin/bookings` — admin-only.
- `/api/payments/razorpay/*` — order, verify, webhook (web Checkout flow).

Reasons:

- Razorpay Checkout is a web SDK; mobile would need the React Native SDK and
  separate Razorpay Standard Checkout integration work.
- Daily.co prebuilt iframe is browser-first; native mobile would use the
  Daily React Native SDK, which is a separate integration.
- Astrologer console workflows (queue, schedule, earnings) are too dense for
  mobile v1 and not part of the user-facing app.

When mobile-consult lands, expect new mobile-specific endpoints and/or
shape adjustments — re-read this section then.

## AI infrastructure (Phase 4)

### POST `/api/horoscopes/:kind/stream`
- Auth: cookie OR Bearer (same as `GET /api/horoscopes/:kind`).
- Body: `{ profileId: string, forDate?: string (ISO-8601) }`.
- Response: `text/event-stream` (SSE).
- Event contract: `ChatStreamEvent` (see `src/shared/types/chat.ts`) plus a
  horoscope-specific extension on the terminal `done` frame:
  - `delta` — `{ kind: "delta", text: string }` — additive token slice.
    Note: predictions use Gemini's JSON mode, so `delta.text` is raw JSON
    fragments and is NOT human-readable until the buffer is parsed at
    `done` time. Mobile clients should buffer rather than render deltas
    directly (or use them only for a typing indicator).
  - `done` — `{ kind: "done", cached: boolean, payload: HoroscopePayload,
    displayFacts: HoroscopeDisplayFact[], provider: string|null,
    model: string|null, generatedAt: string (ISO) }`.
  - `error` — `{ kind: "error", message: string }`.
- A cached prediction yields `done` immediately without any `delta` events.
- Strategy: try `GET /api/horoscopes/:kind` first if you only need cached
  data; otherwise call `/stream` for first-time generation. Fall back to
  `GET` if SSE fails — `GET` computes synchronously and caches the same
  result.

### Disclaimer footer (server-side, do NOT strip)
- Predictions and reports are auto-suffixed with a one-line entertainment
  disclaimer (`_For self-reflection and entertainment, not medical, legal,
  or financial advice._`). The footer is part of `payload.body` /
  `bodyMarkdown` — render it as-is. Chat and compatibility outputs are
  exempt and have no footer.

### Birth-data quality caveats (inline)
- When a profile has `unknownTime: true`, missing place/coords, or fuzzy
  date data, the LLM is briefed with caveats that surface as italicised
  hedges inside the prediction body itself ("Birth time is unknown — Moon
  and ascendant are approximate…"). Mobile shouldn't try to detect these
  programmatically; they're plain English.

### Output safety softener (inline)
- If a prediction or report trips the medical/legal/financial advice
  detector, the body is suffixed with a softener line ("I can offer
  perspective here, but for medical, legal, or financial decisions please
  consult a qualified professional."). Treat as part of the body text.

### Chat memory injection (transparent to mobile)
- When the user starts a new chat session, the server quietly pulls
  summaries of their last 5 idle past sessions and injects them into the
  system prompt of the new session. This is invisible to the wire format
  — `GET /api/chat/sessions/:id` filters out the SYSTEM-role memory
  carrier message. Past-session themes simply make the assistant feel
  more continuous; no new fields on the messages payload.

## Portal-completion additions (web today, mobile-ready)

### User settings — `/api/user/settings`
- Auth: cookie OR Bearer.
- `GET` returns `{ user: { id, email, name, role, readingStyle, themePreference, notificationPrefs }, profiles, defaultProfileId }`.
- `PATCH` body is a partial: `{ account?: { name?: string|null }, password?: { oldPassword, newPassword }, readingStyle?: "WESTERN"|"VEDIC", themePreference?: "light"|"dark"|"system", notificationPrefs?: { booking?, payout?, message?, kyc? } }`.
- `POST /api/user/settings/sign-out-everywhere` revokes all sessions for the caller.

### In-app notifications — `/api/notifications*`
- `GET /api/notifications?unread=true&limit=25&offset=0` → `{ rows, total, unread, limit, offset }`.
- `POST /api/notifications/:id/read`.
- `POST /api/notifications/read-all`.
- `GET /api/notifications/unread-count` → `{ count }`.
- Notification rows have `{ id, kind, title, body, payload, readAt, createdAt }`. `payload.href` (when present) is the in-app destination.
- Notification kinds: `BOOKING_CONFIRMED|BOOKING_REMINDER|BOOKING_CANCELLED|BOOKING_COMPLETED|PAYOUT_PROCESSED|PAYOUT_REJECTED|KYC_APPROVED|KYC_REJECTED|CHAT_MESSAGE|NEW_REVIEW|MODERATION_ACTION|SYSTEM`.

### Chat tool-calls (additive on the existing SSE)
- The chat stream now emits an additional event `tool_call` between deltas and `done`:
  - `{ kind: "tool_call", name: "show_chart"|"show_compatibility"|"show_transit_today"|"show_predictions"|"navigate", args: object, href: string|null }`.
- Order: zero or more `delta`, then optionally one `tool_call`, then exactly one `done` or `error`.
- Mobile may render a single follow-up action button under the assistant message; tap to navigate to `href` (always a relative in-app path) or use `args` to drive a native handler.

### AI locale adaptation (no API change)
- The user's `readingStyle` (settable via `/api/user/settings`) is now applied transparently to horoscope, chat, report and compatibility prompts. Defaults to `VEDIC`. No new fields on responses; tone shifts.
