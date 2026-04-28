# Astrology App — To-Do

> Granular, ordered, check-off list. Pair with `roadmap.md` for phase context.
> Mark `[x]` as items land on `main`.

---

## Phase 0 — Foundations

> Package manager: **npm** (matches existing `package-lock.json`).

### Setup & infra
- [x] **NeonDB project** + connection string in `.env.local`
- [x] **GitHub repo** `Tatu1984/Astro` (fresh git init inside `astro/`)
- [x] **GitHub repo** `Tatu1984/Astro-Compute` (separate FastAPI service)
- [ ] **Vercel project link**: import `Tatu1984/Astro`, set 5 env vars (`DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_SECRET`, `COMPUTE_BASE_URL`, `COMPUTE_SHARED_SECRET`), redeploy
- [x] **UI direction**: shadcn (under `src/frontend/components/ui/shadcn/`) + reactbits.dev for animated effects (saved to memory)

### Folder restructure (SoW §6)
- [x] `src/{backend,frontend,shared,config}/` created and populated
- [x] Imports rewritten across 43 files
- [x] `npm run typecheck` and `npm run build` pass

> **SoW deviation:** route handlers must live in `src/app/api/.../route.ts` (Next.js requirement); the SoW's `src/backend/api/` would never be discovered by Next. Resolution: thin `route.ts` shells call services in `src/backend/services/`.

### Prisma & DB
- [x] Prisma 7 with `prisma.config.ts` + `@prisma/adapter-pg`
- [x] Schema split into 4 migrations (`init`, `auth_profile_chart`, `chart_unique_user_input`, `astrologer_profile`)
- [x] pgvector extension enabled (Phase 2 RAG)

### Config & validation
- [x] `src/config/env.ts` Zod-validated env loader
- [x] `.env.example` checked in; `.gitignore` allows `.env.example`

### CI
- [x] `.github/workflows/ci.yml` — install + db:generate + typecheck + build
- [ ] **Lint cleanup** then re-enable `lint` in CI (4 pre-existing scaffolding errors):
  - `src/app/page.tsx:157` — unescaped `'`
  - `src/app/user/page.tsx:43` — unescaped `'`
  - `src/app/user/chat/page.tsx:32` — `Date.now()` during render
  - `src/frontend/components/effects/TextType.tsx:17` — `setState` in effect

### Phase 0 done when
- [x] `typecheck` + `build` clean on every commit
- [x] DB schema in sync with `main`
- [ ] PR opens green CI **and** green Vercel preview

---

## Phase 1 — Auth, Profiles, Chart Compute

### Database
- [x] `User`, `Account`, `Session`, `VerificationToken`, `Profile`, `Chart`, `AstrologerProfile` migrated to NeonDB
- [x] Enums: `UserRole`, `AstroSystem`, `ProfileKind`, `HouseSystem`, `ChartKind`, `KycType`, `AstrologerStatus`
- [ ] `Plan` tier rows + `GlossaryEntry` seed (lands with Phase 2)

### Auth (Auth.js v5)
- [x] `next-auth@beta` + `@auth/prisma-adapter` + `bcryptjs`
- [x] Edge-safe split: `auth.config.ts` (proxy) vs `auth.ts` (Node + Prisma + Credentials)
- [x] Email/password signup (POST `/api/auth/signup`, role hardcoded USER)
- [x] Credentials login + JWT session, role on `session.user.role`
- [x] `/login` and `/register` pages (shadcn primitives, Aurora background)
- [x] Dev-account hints on `/login` gated by `NEXT_PUBLIC_SHOW_DEV_HINTS`
- [x] `/post-login` server router → role-appropriate dashboard
- [x] Sign-out button on every portal `TopBar`
- [ ] Google OAuth provider (needs `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`)
- [ ] Apple OAuth (needs paid Apple Developer account)
- [ ] Facebook OAuth (needs Meta Dev app)
- [ ] Phone OTP (Twilio Verify or MSG91 — defer)

### Proxy / RBAC
- [x] `src/proxy.ts` (Next 16 renamed `middleware.ts`) gates by role:
  - `/admin/*`        → ADMIN only
  - `/astrologer/*`   → ASTROLOGER or ADMIN
  - `/user/*`         → any signed-in user
  - Wrong role → redirect to `/user`; not signed in → `/login`
- [x] API handlers re-check role (defence in depth, returns 401/403)

### Profiles (birth-data)
- [x] OSM Nominatim geocoder (`src/backend/utils/geocode.util.ts`, no API key)
- [x] `tz-lookup` server-side timezone from lat/lng (kept off client bundle)
- [x] `GET/POST /api/profiles`, `DELETE /api/profiles/[id]` (auth-gated, ownership check)
- [x] `GET /api/geocode?q=` and `GET /api/tz?lat=&lng=` (auth-gated)
- [x] **Leaflet map picker** with search + draggable marker (`MapPicker` + `MapPickerInner`)
- [x] `date-fns-tz` zones local birth datetime → UTC for storage
- [x] `/user/profile` page: list + add + delete; "I don't know my birth time" toggle (uses noon UTC)
- [x] Soft-delete via `deletedAt`; `PROFILE_SOFT_CAP` = 50

### Python compute microservice (Astro-Compute)
- [x] FastAPI scaffold deployed on Render free tier (Python 3.12.5)
- [x] `POST /natal` (Moshier ephemeris, no data files needed)
- [x] `X-Compute-Secret` shared-secret auth
- [x] Smoke tested end-to-end from Next.js
- [ ] Switch to Swiss Ephemeris (FLG_SWIEPH) by bundling `.se1` data files in image
- [ ] Add Chiron + asteroids (need `seas_18.se1`)
- [ ] `/transit`, `/synastry`, `/dasha`, `/divisional` endpoints (Phase 2/3)

### Chart pipeline (Next.js side)
- [x] `chart.service.resolveNatal`: cache lookup → compute → upsert
- [x] `chart.repository`: idempotent upsert on `(userId, kind, system, houseSystem, inputHash)`
- [x] `POST /api/charts/natal` (auth-gated, Zod-validated, profile-bound)
- [x] `/user` landing renders real planets/signs/houses panel beside the wheel
- [x] **Real ChartWheel geometry**: planet glyphs at real longitudes, house cusps, Asc/MC axes, house numbers, conjunction stacking, retrograde marker
- [x] `/user/chart` full chart viewer with profile switcher, axes panel, all 12 cusps
- [ ] North Indian SVG renderer
- [ ] South Indian SVG renderer
- [ ] Aspect grid component (math: pairwise angle deltas; major aspects within orbs)
- [ ] House-systems toggle in UI (Placidus / Whole Sign / Koch / Equal / Vedic Equal)
- [ ] Divisional charts D1–D60 (needs Python compute support)

### Admin & RBAC (added scope, fits Phase 1)
- [x] Seed: `admin@astro.local` has `role=ADMIN`; user1/user2 are USER
- [x] `/admin/users` shows real Postgres data with role-count badges
- [x] Promote/demote between USER and ASTROLOGER (refuses self / refuses to touch ADMIN)
- [x] `GET /api/admin/users`, `PATCH /api/admin/users/[id]/role`

### Astrologer foundation (added scope, SoW §3.2 "foundation only")
- [x] `AstrologerProfile` schema (KYC, banking, qualifications, address, status)
- [x] **`+ Astrologer` button** on `/admin/users` opens a sectioned dialog (Account / Contact / KYC / Professional / Banking)
- [x] `POST /api/admin/astrologers` creates `User(role=ASTROLOGER) + AstrologerProfile` in a transaction
- [x] `/admin/astrologers` review queue with status badges + Approve/Reject/Suspend/Reactivate buttons (state-machine enforced)
- [x] `GET /api/admin/astrologers` returns SAFE projection (no kycNumber, bank, UPI in list)
- [x] `PATCH /api/admin/astrologers/[id]/status`
- [ ] **Astrologer self-portal** (in progress now): `/astrologer` dashboard with status banner + profile snapshot; `/astrologer/profile` read-only detail of own KYC/bank/UPI
- [ ] Astrologer profile **edit** (non-sensitive fields: bio, qualifications, specialties, address)
- [ ] Admin "view detail" drawer on `/admin/astrologers` showing full KYC + bank (uses `getAstrologerDetail`)
- [ ] Field-level encryption for `kycNumber`, `bankAccountNumber`, `bankIfsc`, `upiId` **before any prod data** (XChaCha20 with key from env)

### Phase 1 done when
- [x] User signs up, creates a Profile, sees their real chart on `/user`
- [x] Admin onboards, approves, suspends astrologers via `/admin`
- [x] Astrologer signs in, lands on `/astrologer`, sees their KYC status + profile
- [x] Real chart wheel plots actual planet longitudes
- [x] Cache verified end-to-end (cached=true on second request)
- [x] Vercel deploy live at `astro-wine-beta.vercel.app` (verified 2026-04-28)

---

## Phase 2 — AI & Predictions

- [x] `llm.router.ts` with Gemini provider (gemini-2.5-flash default, gemini-2.5-pro for reports). Pluggable for Groq/Anthropic/OpenAI when keys land
- [x] Prompt builder consumes chart JSON; chart JSON treated as ground truth in every prompt
- [x] Daily / weekly / monthly / yearly horoscope routes — `/api/horoscopes/[kind]` with periodStart-keyed cache
- [x] AI Chat with Chart: sessions, messages, ground-truth chart context, streaming responses via SSE
- [x] Long-form reports (Career / Love / Health / Education / Spiritual / Natal-full) → markdown rendered with Tailwind typography
- [x] `LlmCallLog` writes on every LLM call (success + error)
- [x] Admin LLM-cost dashboard reads real data — KPIs, by-provider, by-route, recent errors
- [ ] Glossary content seeded; `Embedding` table populated via job (RAG retrieval)
- [ ] BullMQ precompute jobs (Upstash Redis) — pre-bake daily horoscopes overnight
- [x] Streaming responses for chat (SSE)
- [x] LLM router single-retry on 503/429/UNAVAILABLE/RESOURCE_EXHAUSTED
- [ ] Puppeteer → PDF → R2 for reports (defer until R2 keys are needed)
- [ ] Safety filters: medical/legal/financial disclaimer auto-injection on reports/chat (currently chat is told to recommend pro consult; reports are silent)

---

## Phase 3 — Compatibility, Calendar, Notifications

- [x] Synastry compatibility (TS-side aspect math) for ROMANTIC / FRIENDSHIP / BUSINESS / FAMILY
- [x] Compatibility UI: list + generate form + detail with score, top aspects, narrative
- [x] Community feed: `Post` / `Comment` / `Reaction` schema + APIs + UI (public + anonymous)
- [ ] Composite / Davison composite charts (Python compute extension)
- [ ] Ashtakoot Milan + Manglik (needs Jyotisha / Vedic libs in Python compute)
- [ ] Calendar / Muhurta finder + retrograde / eclipse alert generators (needs Python `/transit`)
- [ ] BullMQ scheduled jobs (Upstash Redis)
- [ ] FCM + APNs push pipeline + `DeviceToken` registration
- [ ] Shareable card generator

---

## Phase 4 — Mobile + Polish

- [ ] Turborepo + pnpm workspaces; `apps/web` + `apps/mobile` (Expo)
- [ ] Shared `chart-engine` SDK between web & mobile
- [ ] React Native parity for P0 (auth, profile, chart wheel, daily horoscope)
- [ ] MMKV offline cache; home-screen widget (iOS + Android)
- [ ] Accessibility audit (WCAG 2.2 AA)
- [ ] i18n: EN + HI + 2 regional Indian languages

---

## Phase 5 — Hardening & Launch

- [ ] Stripe (web) + RevenueCat (mobile) entitlements unified → `Subscription` + `Invoice`
- [ ] Load test daily-horoscope path (k6 or Artillery)
- [ ] Security review (OWASP ASVS L2)
- [ ] Doppler for secrets
- [ ] iOS App Store + Google Play submission
- [ ] Runbooks: deploy / rollback / incident / LLM-vendor switch
- [ ] CONTRIBUTING.md + README polish
- [ ] Soft-launch

---

## Cross-cutting (run continuously)

- [ ] Sentry on web + Python micro
- [ ] OpenTelemetry traces; PostHog product analytics
- [ ] Vitest unit + Playwright E2E grow per feature
- [ ] OpenAPI 3.1 generated from Zod schemas
- [ ] `Consent` table writes on TOS / Privacy / marketing acceptance
- [ ] `AuditLog` writes on auth events, role changes, astrologer status changes

---

## Blocked / awaiting input

- [ ] **Vercel project link** + 5 env vars set in Vercel project (only blocker on a green production deploy)
- [ ] **Compute host upgrade** (Render free tier sleeps after 15 min — not a problem for dev; upgrade to Starter ($7/mo) before any real users)
- [ ] **App name + domain**
- [ ] **2 regional Indian languages** beyond EN/HI (needed for Phase 4)
