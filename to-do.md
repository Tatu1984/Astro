# Astrology App — To-Do

> Granular, ordered, check-off list. Pair with `roadmap.md` for phase context.
> Mark `[x]` as items land on `main`.

---

## Phase 0 — Foundations

> Package manager: **npm** (matches existing `package-lock.json`).

### Setup & infra (needs you)
- [x] **Create NeonDB project**; paste connection string into `.env.local` as `DATABASE_URL`
- [x] **Decide git layout** — fresh repo inside `astro/` (clean isolation from parent)
- [x] **Create GitHub repo** for astro and push `main` (`git@github.com:Tatu1984/Astro.git`)
- [ ] **Link Vercel project** to the GitHub repo; verify preview deploy on first PR
  - In Vercel project Settings → Environment Variables: add `DATABASE_URL` with the NeonDB string (without it, build fails because `src/config/env.ts` requires it)
  - Add `NEXTAUTH_URL` = your Vercel preview URL (or leave blank until custom domain)
  - Re-trigger the deploy; Prisma client now generates via `postinstall` hook
- [x] **Decide UI direction**: shadcn for primitives + reactbits.dev for animated effects (saved to memory)

### Folder restructure (SoW §6)
- [x] Create `src/backend/{services,repositories,validators,database,utils}` (no `api/` — see note below)
- [x] Create `src/frontend/{components,hooks,store,api/endpoints,api/types,utils}`
- [x] Create `src/shared/{types,constants,utils}`
- [x] Create `src/config/`
- [x] Move `src/components/*` → `src/frontend/components/`
- [x] Move `src/lib/cn.ts` → `src/frontend/utils/cn.ts`
- [x] Bulk-rewrite imports across 43 files (`@/components/*` → `@/frontend/components/*`, `@/lib/cn` → `@/frontend/utils/cn`)
- [x] `npm run typecheck` passes; `npm run build` passes (all 34 pages render)

> **SoW deviation:** Next.js 16 App Router requires `route.ts` files inside `src/app/api/.../`. The SoW puts them under `src/backend/api/` which doesn't work. Resolution: thin `route.ts` shells live in `src/app/api/` and call into `src/backend/services/` for actual logic. Preserves the SoW's three-layer separation.

### Prisma & DB
- [x] `npm i prisma @prisma/client @prisma/adapter-pg pg dotenv`
- [x] Create `prisma.config.ts` (Prisma 7 — loads `DATABASE_URL` from env)
- [x] Create `src/backend/database/prisma/schema.prisma` (no `url` in datasource block)
- [x] Create `src/backend/database/client.ts` (PrismaClient + adapter-pg singleton, no `datasourceUrl`)
- [x] `npm run db:generate` succeeds against placeholder URL
- [x] `npm run db:migrate -- --name init` against real NeonDB — applied; enables pgvector

### Config & validation
- [x] `npm i zod`
- [x] `src/config/env.ts` — Zod-validated env loader; throws at boot on invalid env
- [x] `.env.example` checked in
- [x] `.gitignore` excludes `.env*` but allows `.env.example`

### CI
- [x] `.github/workflows/ci.yml` — install + db:generate + typecheck + build on PR
- [ ] **Lint cleanup** (then re-enable `lint` step in CI): pre-existing scaffolding has 4 errors:
  - `src/app/page.tsx:157` — unescaped `'`
  - `src/app/user/page.tsx:43` — unescaped `'`
  - `src/app/user/chat/page.tsx:32` — `Date.now()` called during render (React purity)
  - `src/frontend/components/effects/TextType.tsx:17` — `setState` in effect body
- [ ] First PR opens green CI + green Vercel preview

### Phase 0 done when
- [x] `npm run typecheck` clean
- [x] `npm run build` clean
- [x] `npm run db:migrate` clean against real NeonDB
- [ ] PR opens green CI + green Vercel preview

---

## Phase 1 — Auth, Profiles, Chart Compute

### Database
- [ ] Add `User`, `AuthIdentity`, `Session`, `Profile`, `Chart` to `schema.prisma` (per SoW §10)
- [ ] `pnpm prisma migrate dev --name auth_profile_chart`
- [ ] `seed.ts` for plans + glossary stub

### Auth
- [ ] `pnpm add next-auth@5` + adapter for Prisma
- [ ] Email/password login + register (start)
- [ ] Google OAuth provider
- [ ] Apple OAuth provider
- [ ] Facebook OAuth provider
- [ ] Phone OTP (provider TBD: Twilio Verify / MSG91)
- [ ] Session middleware in `src/backend/api/middleware.ts`

### Profiles
- [ ] Birth-data form (date/time/place/unknown-time flag)
- [ ] OpenCage geocoding util in `src/backend/utils/geocode.util.ts`
- [ ] `POST /api/profiles` — create Profile (Zod-validated)
- [ ] `GET /api/profiles` — list user's profiles
- [ ] `PATCH /api/profiles/:id` — edit
- [ ] Profile management UI in user portal

### Python compute microservice
- [ ] Decide host: Render or Fly.io
- [ ] Bootstrap FastAPI project: `services/compute/` (or separate repo)
- [ ] `pip` deps: `pyswisseph`, `kerykeion`, `jyotisha`, `flatlib`
- [ ] `POST /natal` endpoint → returns deterministic chart JSON
- [ ] Internal auth: shared secret in header
- [ ] Deploy to Render/Fly free tier
- [ ] Smoke test from local Next.js

### Chart pipeline
- [ ] `chart.service.ts` calls Python micro
- [ ] `chart.repository.ts` persists to `Chart` table with `inputHash` cache
- [ ] `POST /api/charts/natal` route handler
- [ ] Wire `ChartWheel` to real chart JSON (replace mock)
- [ ] North Indian style SVG renderer
- [ ] South Indian style SVG renderer
- [ ] Aspect grid component
- [ ] Divisional charts D1–D60 (pick subset for v1)
- [ ] House systems toggle (Placidus / Whole Sign / Koch / Equal / Vedic Equal)

### Phase 1 done when
- [ ] Signed-in user submits birth data
- [ ] Real natal chart renders on screen (Western + Vedic)
- [ ] Chart cached on second view (no recompute)

---

## Phase 2 — AI & Predictions

- [ ] LLM router (`llm.router.ts`) with Gemini + Groq + Anthropic + OpenAI providers
- [ ] Prompt builder seeded from chart JSON
- [ ] pgvector enabled in NeonDB; `Embedding` table
- [ ] Glossary seed + embedding job
- [ ] Daily horoscope route + BullMQ precompute
- [ ] Weekly / monthly / yearly horoscope routes
- [ ] Long-form report generators (Career, Love, Health, Education, Spiritual)
- [ ] PDF rendering via Puppeteer → R2
- [ ] AI Chat with Chart (sessions, messages, streaming)
- [ ] Safety filters + disclaimer panel
- [ ] `LlmCallLog` writes on every LLM call
- [ ] Admin LLM-cost dashboard wires to real data

---

## Phase 3 — Compatibility, Calendar, Notifications

- [ ] Synastry compute in Python micro
- [ ] Composite + Davison compute
- [ ] Ashtakoot Milan + Manglik compute
- [ ] Compatibility UI in user portal
- [ ] Muhurta finder
- [ ] Retrograde + eclipse alert generators
- [ ] BullMQ scheduled jobs
- [ ] FCM + APNs push pipeline
- [ ] DeviceToken registration endpoint
- [ ] Community feed: Post / Comment / Reaction
- [ ] Shareable card generator

---

## Phase 4 — Mobile + Polish

- [ ] Turborepo + pnpm workspaces migration
- [ ] `apps/web` (move current Next.js) + `apps/mobile` (Expo) + `packages/shared` + `packages/chart-engine`
- [ ] React Native: auth, profiles, chart wheel, daily horoscope (parity with web P0)
- [ ] MMKV offline cache
- [ ] Daily horoscope home-screen widget (iOS + Android)
- [ ] Accessibility audit (WCAG 2.2 AA)
- [ ] i18n: EN + HI + 2 regional (chosen at kickoff)

---

## Phase 5 — Hardening & Launch

- [ ] Stripe checkout + webhook → `Subscription` + `Invoice`
- [ ] RevenueCat integration (mobile entitlements)
- [ ] Load test daily-horoscope path (k6 or Artillery)
- [ ] Security review (OWASP ASVS L2 checklist)
- [ ] Doppler for secrets
- [ ] iOS App Store submission
- [ ] Google Play submission
- [ ] Runbooks: deploy, rollback, incident response, LLM-vendor switch
- [ ] CONTRIBUTING.md + README polish
- [ ] Soft-launch announcement

---

## Blocked / awaiting input

> Move items here when blocked on the user. Move back when unblocked.

- [ ] **NeonDB connection string** — needed to run `db:migrate` (Phase 0 closeout)
- [ ] **Git layout decision** — fresh repo in `astro/` vs parent `projects/` repo
- [ ] **GitHub repo URL** for `astro` project (after git decision)
- [ ] **Vercel project link**
- [ ] **shadcn/ui vs hand-rolled primitives** decision
- [ ] **Compute host**: Render or Fly.io (needed for Phase 1)
- [ ] **App name + domain**
- [ ] **2 regional Indian languages** beyond EN/HI (needed for Phase 4)
