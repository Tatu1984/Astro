# Portal completion — checklist by persona

This is a smoke-test list of the portal features now live across the three
personas. Each feature ships as a real DB-backed flow (no mocks) but
notifications/email side-channels are intentionally in-app only — SES/SMTP
hookup is deferred.

## User (`/user/*`)

- [x] **Settings** at `/user/settings`:
  - Read-only email; editable name.
  - Change password (old password required, bcryptjs verify, hash 12 rounds).
  - Default profile picker (localStorage hint; server-side default falls back to oldest profile).
  - Reading style — `Vedic` (default, cultural framing) or `Western` (psychological framing). Applied across horoscope/chat/report/compatibility prompts.
  - Theme preference — light/dark/system (persisted server-side; client renderer picks it up next session).
  - Notification toggles — booking / payout / message / kyc.
  - Sign out everywhere (revokes all sessions).
- [x] **Chart tour** — modal on first visit to `/user/chart` (3 slides; localStorage flag `astro_chart_tour_seen`).
- [x] **Notification bell** in the top bar — shows unread badge, polls every 60s, opens dropdown of recent notifications. Click marks read + navigates if `payload.href` present.
- [x] **Booking notifications** — confirmed/cancelled/completed events fire in-app rows for both the user and the astrologer.
- [x] **Watch session recording** — when a booking is `COMPLETED` and the astrologer uploaded a recording, a `Watch recording` button appears on the booking detail page. Opens a 15-minute signed URL in a new tab.
- [x] **AI tool buttons** — when the chat assistant suggests an action ("look at my chart"), a small action button appears under the message; tap to navigate.

## Astrologer (`/astrologer/*`)

- [x] **Templates** at `/astrologer/templates` — list + create/update/delete consult-note templates. Optional admin-shared templates are listed read-only.
- [x] **Insert template** dropdown above the notes textarea on `/astrologer/session/[id]`.
- [x] **Recording upload** on the same session page — accepts MP4/WebM/MP3 up to 500 MB. Saves to `recordings/<bookingId>/<file>` in the storage bucket (stub-friendly), sets `ConsultSession.recordingUrl`. Replace + delete supported. Audit-logged.
- [x] **Clients page** at `/astrologer/clients` — rows linkable to `/astrologer/clients/[userId]`.
- [x] **Per-client detail** — booking history + private notes panel. Notes can be general or linked to a specific booking; chronological list with delete.
- [x] **Notifications**:
  - Booking confirmed (your client booked you).
  - Booking cancelled (mirror).
  - Payout processed / payout rejected.
  - KYC approved / KYC rejected.

## Admin (`/admin/*`)

- [x] **Analytics** at `/admin/analytics` (new sidebar entry):
  - Funnel — Signup → Profile → Chart → Prediction → Chat → Booking. Configurable window (7 / 30 / 90 days).
  - Cohort — weekly retention heatmap, last 12 cohorts. Activity = Prediction OR ChatMessage OR Booking.
  - Anomalies — runs each request:
    - Today's LLM cost vs trailing 7d avg (flag at >2x, critical at >4x).
    - Today's signups vs trailing 7d avg (flag at <0.3x — drought).
    - Today's refund count vs trailing 7d avg (flag at >2x).
    - Today's failed-LLM-call rate vs trailing 7d avg (flag at >2x).
- [x] **Notifications fire on moderator actions** — banned users see a `MODERATION_ACTION` row on their bell.

## What's intentionally out of scope

- **Email/SMS notifications.** The notification service has a single
  in-app delivery path. SES/SMTP/SNS wiring lands in a follow-up — `notify()`
  silently absorbs delivery failures so we never block the action.
- **Daily.co recording auto-pull.** We only support manual upload by the
  astrologer. Programmatic Daily Cloud-recording tier integration is
  follow-up work.
- **Theme preference enforcement.** We persist the preference; the
  globally applied theme switcher (CSS root attribute) lands when we
  introduce a real theme provider.
- **Default profile auto-selection at server.** The settings page persists
  the choice client-side; chart workspace already uses the first profile
  if no `?profile=` is given. Server-side default lookup is straightforward
  to add when needed.

## Schema additions (see `prisma/migrations-preview/portal_completion.sql`)

- `User.readingStyle` (`ReadingStyle`, default `VEDIC`).
- `User.themePreference` (`String?`, default `'system'`).
- `User.notificationPrefs` (`Json?`).
- `enum ReadingStyle { WESTERN VEDIC }`.
- `model Notification { ... }` + `enum NotificationKind { ... }`.
- `model ConsultTemplate { ... }`.
- `model ClientNote { ... }`.

The preview SQL is full-from-empty (Prisma 7 has no `--from-schema-datasource`
flag yet); apply via the standard `prisma migrate dev --name portal_completion`
flow when ready to land it on the live DB.
