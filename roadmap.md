# Astrology App — Roadmap

> Execution plan against `docs/sow/sow.md`. Phases mirror SoW §13. Update this file as scope/dates shift.

---

## Phase 0 — Foundations *(Week 1)*

Get the skeleton ready before any feature work.

- NeonDB project provisioned; connection string in `.env.local`
- Prisma 7 wired: `prisma.config.ts`, `@prisma/adapter-pg`, no `url` in `schema.prisma`
- Folder restructure to SoW §6 convention (`src/backend`, `src/frontend`, `src/shared`, `src/config`)
- Env validation with Zod (`src/config/env.ts`)
- shadcn/ui installed (or explicit decision to keep hand-rolled primitives)
- Vercel project linked + preview deploys on PR
- GitHub Actions: lint, type-check, build on PR

**Exit criteria:** `pnpm dev` boots cleanly on the new structure; PR opens a green Vercel preview.

---

## Phase 1 — Auth, Profiles, Chart Compute *(Weeks 2–5)*

The load-bearing slice. Everything later builds on Profile + Chart.

- Prisma migrate: `User`, `Account`, `Session`, `VerificationToken`, `Profile`, `Chart`, `AstrologerProfile` from SoW §10 phase-1 subset
- NextAuth v5: Email/password first; Google + Apple + Facebook + Phone OTP
- Birth-data form + **OSM Nominatim** geocoding (replaces OpenCage which now requires a card) → lat/long/timezone
- **Python FastAPI compute microservice** on Render: pyswisseph (Moshier mode); Kerykeion + Jyotisha land in Phase 2/3
- Deterministic chart JSON; `Chart.inputHash` cache to skip recompute
- `/api/charts/natal` route handler → service → repository → Python micro
- **Admin + RBAC closeout**: `/admin/users` user mgmt, `/admin/astrologers` review queue (Approve / Reject / Suspend / Reactivate), `+ Astrologer` onboarding dialog (KYC + bank + qualifications)
- **Astrologer foundation** (SoW §3.2 "foundation only"): self-portal at `/astrologer` with status banner + profile snapshot
- Wire existing `ChartWheel` to real data; add North/South Indian SVG renderers
- Aspect grid, divisional charts D1–D60, multiple house systems (Placidus/Whole Sign/Koch/Equal/Vedic Equal)

**Exit criteria:** A signed-in user submits birth data and sees their real natal chart on screen; an admin can onboard, approve, and suspend astrologers; an astrologer can sign in and see their own status + profile.

---

## Phase 2 — AI & Predictions *(Weeks 6–9)*

- LLM router (`src/backend/services/llm.router.ts`) — Gemini Flash primary, Groq fallback, config-driven
- Prompt builder seeded from chart JSON (no hallucinated planet positions)
- pgvector RAG: glossary + tradition corpus
- Daily / weekly / monthly / yearly horoscope routes; BullMQ precompute jobs
- Long-form reports (Career, Love, Health, Education, Spiritual) → markdown + Puppeteer PDF → R2
- AI Chat with Your Chart (sessions + messages, cost via `LlmCallLog`)
- Safety filters + disclaimer enforcement on remedial / predictive surfaces

**Exit criteria:** Daily horoscope p95 < 1.9s end-to-end; cost dashboard shows per-route LLM spend.

---

## Phase 3 — Compatibility, Calendar, Notifications *(Weeks 10–12)*

- Synastry, Composite, Davison, Ashtakoot Milan, Manglik (compute in Python micro)
- Muhurta finder, retrograde alerts, eclipse notifications
- BullMQ jobs + FCM/APNs push pipeline
- Community feed (`Post`/`Comment`/`Reaction`), shareable cards

**Exit criteria:** Two users can compute compatibility; transit/eclipse notifications fire.

---

## Phase 4 — Mobile + Polish *(Weeks 13–16)*

- Monorepo migration (Turborepo + pnpm workspaces); `apps/mobile` (Expo + React Native)
- Share `shared/` types and chart-engine SDK between web and mobile
- Offline cache (MMKV), home-screen widget, accessibility audit (WCAG AA)
- i18n (EN + HI + 2 regional Indian languages)

**Exit criteria:** iOS + Android internal builds reach feature parity with web for P0.

---

## Phase 5 — Hardening & Launch *(Weeks 17–20)*

- Stripe (web) + RevenueCat (mobile) entitlements unified
- Load test daily-horoscope path against SLOs (SoW §11)
- Security review (OWASP ASVS L2); secrets via Doppler
- App store submissions; soft-launch
- Runbooks (deploys, rollbacks, incident response, LLM-vendor switch)

**Exit criteria:** All §16 acceptance criteria green for 7 consecutive days on `main`.

---

## Cross-cutting tracks (run continuously)

- **Observability**: Sentry + OpenTelemetry + PostHog wired from Phase 1
- **Testing**: Vitest unit + Playwright E2E grow alongside features (no big-bang test phase)
- **Docs**: OpenAPI 3.1 generated from Zod schemas; runbooks updated per release
- **Compliance**: Consent + AuditLog tables active from Phase 1; export/delete endpoints by Phase 5
