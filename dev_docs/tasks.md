# Tasks: FlareLens — Cloudflare Budget Guard

**Input**: Design documents from `dev_docs/`
**Prerequisites**: flarelens.md (product plan), technical_architecture.md (architecture + schema + API)

**Tests**: Not included — add test tasks per-phase when explicitly requested.

**Organization**: Tasks grouped by user story to enable independent implementation and testing. path (Phases 1–5) clearly marked.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **API**: `apps/api/src/`
- **Web**: `apps/web/src/`
- **Shared packages**: `packages/shared/src/`, `packages/db/src/`
- **Config**: root `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo scaffolding, shared packages, tooling, and Cloudflare bindings

- [X] T001 Create `packages/shared/` package with `package.json`, `tsconfig.json` — shared types, constants, and validation schemas used by both apps
- [X] T002 Create `packages/db/` package with `package.json`, `tsconfig.json` — D1 schema, migrations, and repository helpers
- [X] T003 [P] Add `@flarelens/shared` and `@flarelens/db` workspace references to `apps/api/package.json` and `apps/web/package.json`
- [X] T004 [P] Configure `apps/api/wrangler.jsonc` with D1, KV, R2, Queues, Analytics Engine, Durable Object bindings and environment variables
- [X] T005 [P] Configure `apps/web/wrangler.jsonc` with service binding to API worker and KV session store
- [X] T006 [P] Add shared dev dependencies to root `package.json`: `prettier`, `eslint`, `@biomejs/biome` (pick one linter/formatter) and configure
- [X] T007 [P] Create `apps/api/src/env.ts` — typed `Env` interface for all Cloudflare bindings (D1, KV, R2, Queues, AE, DO)
- [X] T008 [P] Run `pnpm cf-typegen` in both apps to generate binding types; verify types compile
- [X] T009 [P] Create initial D1 migration `packages/db/migrations/0001_init.sql` with all tables from technical_architecture.md §9
- [X] T010 Verify monorepo builds: `pnpm build` succeeds for all packages and apps; `pnpm dev` starts both workers locally

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### 2A: Shared Types & Utilities

- [ ] T011 [P] Define domain types in `packages/shared/src/types.ts` — User, Account, TeamMember, CfToken, Resource, Rule, Anomaly, Notification, Integration, Mitigation, AuditLog, BillingSnapshot, DeveloperToken
- [ ] T012 [P] Create ULID generator utility in `packages/shared/src/id.ts` (use `ulidx` or hand-roll with `crypto.getRandomValues`)
- [ ] T013 [P] Create Zod validation schemas in `packages/shared/src/schemas/` — `auth.ts` (register, login, reset-password), `rules.ts` (create/update rule), `cf-tokens.ts` (add token), `resources.ts`, `integrations.ts`, `settings.ts`
- [ ] T014 [P] Create error types in `packages/shared/src/errors.ts` — AppError base class, NotFoundError, ValidationError, ForbiddenError, UnauthorizedError, ConflictError
- [ ] T015 [P] Create constants in `packages/shared/src/constants.ts` — plan limits, severity levels, resource types, metric names, time windows, role permissions matrix

### 2B: Database Layer

- [ ] T016 [P] Create base repository helper in `packages/db/src/repository.ts` — account-scoped query builder that enforces `WHERE account_id = ?` on every query
- [ ] T017 [P] Create `packages/db/src/repositories/users.ts` — findByEmail, findById, create, updateProfile, updatePassword
- [ ] T018 [P] Create `packages/db/src/repositories/accounts.ts` — findById, create, updateSettings, updatePlan
- [ ] T019 [P] Create `packages/db/src/repositories/team-members.ts` — list, findByUserId, create (invite), accept, updateRole, remove
- [ ] T020 [P] Create `packages/db/src/repositories/cf-tokens.ts` — list (masked), create, verify, revoke, findActiveByAccount
- [ ] T021 [P] Create `packages/db/src/repositories/resources.ts` — list, create, update, delete, findByAccount, syncFromCF
- [ ] T022 [P] Create `packages/db/src/repositories/rules.ts` — list, create, update, delete, toggle, findEnabledByAccount
- [ ] T023 [P] Create `packages/db/src/repositories/anomalies.ts` — list (filterable), create, dismiss, resolve, findByResource
- [ ] T024 [P] Create `packages/db/src/repositories/notifications.ts` — list (unread/all), create, markRead, markAllRead, archiveAll
- [ ] T025 [P] Create `packages/db/src/repositories/audit-logs.ts` — list (paginated, filterable), create, exportQuery
- [ ] T026 [P] Create `packages/db/src/repositories/integrations.ts` — list, upsert, delete, findByType
- [ ] T027 [P] Create `packages/db/src/repositories/mitigations.ts` — list, create, update, delete, toggle, findTriggerable
- [ ] T028 [P] Create `packages/db/src/repositories/billing-snapshots.ts` — getCurrent, create, update, listInvoices
- [ ] T029 [P] Create `packages/db/src/repositories/developer-tokens.ts` — list, create, revoke, findByHash
- [ ] T030 [P] Create `packages/db/src/repositories/zone-snapshots.ts` — upsert, getLatest, getTimeSeries, cleanupOld
- [ ] T031 [P] Create `packages/db/src/repositories/baselines.ts` — upsert, findByResourceMetric, recalculate

### 2C: Auth & Session

- [ ] T032 Create password hashing module in `apps/api/src/auth/password.ts` — use `bcryptjs` (scrypt or WASM bcrypt, NOT Argon2id which is too slow ~14s on Workers); hash and verify functions
- [ ] T033 Create session manager in `apps/api/src/auth/session.ts` — createSession (generate token, SHA-256 hash, store in KV with TTL), validateSession (lookup, check expiry, sliding window refresh), destroySession
- [ ] T034 Create token encryption module in `apps/api/src/auth/crypto.ts` — encryptToken and decryptToken using AES-256-GCM with `crypto.subtle`, random IV per token

### 2D: API Middleware & Framework

- [ ] T035 Create Hono app factory in `apps/api/src/app.ts` — instantiate Hono with typed `Env`, register global middleware
- [ ] T036 Create auth middleware in `apps/api/src/middleware/auth.ts` — extract `__session` cookie, validate via session manager, attach `{ user_id, account_id, role }` to context; return 401 if invalid
- [ ] T037 Create RBAC middleware in `apps/api/src/middleware/rbac.ts` — `requireRole(...roles)` factory that checks session role against allowed roles; return 403 if forbidden
- [ ] T038 Create validation middleware in `apps/api/src/middleware/validate.ts` — `validate(schema)` factory that parses `c.req.json()` with Zod, attaches result to context or returns 400
- [ ] T039 Create rate-limit middleware in `apps/api/src/middleware/rate-limit.ts` — KV-based counter per `account_id + endpoint group`, configurable limits per group (auth: 10/15min, reads: 300/1min, writes: 60/1min)
- [ ] T040 [P] Create CORS middleware in `apps/api/src/middleware/cors.ts` — allow origins from env, credentials, standard methods/headers
- [ ] T041 [P] Create error handler in `apps/api/src/middleware/error-handler.ts` — catch AppError subtypes, format consistent JSON error responses, log unexpected errors
- [ ] T042 Create repository injection middleware in `apps/api/src/middleware/repos.ts` — instantiate all repositories scoped to `session.account_id`, attach to Hono context
- [ ] T043 Create audit-log helper in `apps/api/src/middleware/audit.ts` — `logAudit()` function that captures user, IP, user-agent, action, entity; writes to D1 audit_logs

### 2E: Web App Foundation

- [ ] T044 [P] Install Tailwind CSS 4 + `@tailwindcss/vite` in `apps/web/`, configure `app.css` with `@import "tailwindcss"`
- [ ] T045 [P] Create layout in `apps/web/src/routes/+layout.svelte` — root layout with `<slot>`, global styles import
- [ ] T046 [P] Create auth store in `apps/web/src/lib/stores/auth.ts` — Svelte 5 runes-based store for current user, session status, login/logout actions
- [ ] T047 [P] Create API client in `apps/web/src/lib/api.ts` — typed fetch wrapper that hits API worker, handles auth cookies, parses errors, returns typed responses

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel

---

## Phase 3: US1 — Account Registration + Cloudflare Connection (Priority: P1)

**Goal**: User can register, log in, connect a Cloudflare API token, and see their monitored zones

**Independent Test**: Register → log in → add CF token → token verified → zones auto-discovered and listed

### Implementation for User Story 1

#### API Routes — Auth

- [ ] T048 [P] [US1] Implement `POST /auth/register` in `apps/api/src/routes/auth.ts` — validate input (name, email, password), check duplicate email, hash password, create user + account + team_member (admin), create session, set cookie, return user profile
- [ ] T049 [P] [US1] Implement `POST /auth/login` in `apps/api/src/routes/auth.ts` — validate credentials, verify password hash, create session, set cookie, return user profile
- [ ] T050 [P] [US1] Implement `POST /auth/logout` in `apps/api/src/routes/auth.ts` — destroy session in KV, clear cookie
- [ ] T051 [P] [US1] Implement `GET /auth/me` in `apps/api/src/routes/auth.ts` — return current user profile from session
- [ ] T052 [US1] Implement `POST /auth/forgot-password` in `apps/api/src/routes/auth.ts` — generate reset token, store in KV (1h TTL), send email via Resend
- [ ] T053 [US1] Implement `POST /auth/reset-password` in `apps/api/src/routes/auth.ts` — validate token from KV, update password hash, delete token, invalidate existing sessions

#### API Routes — CF Tokens & Resources

- [ ] T054 [P] [US1] Implement `POST /cf-tokens` in `apps/api/src/routes/cf-tokens.ts` — validate token format, encrypt with AES-256-GCM, store in D1, trigger verification
- [ ] T055 [P] [US1] Implement `GET /cf-tokens` in `apps/api/src/routes/cf-tokens.ts` — list tokens with masked values (show last 4 chars only)
- [ ] T056 [US1] Implement `POST /cf-tokens/:id/verify` in `apps/api/src/routes/cf-tokens.ts` — decrypt token, call CF API `GET /user/tokens/verify`, check permissions, update status
- [ ] T057 [US1] Implement `DELETE /cf-tokens/:id` in `apps/api/src/routes/cf-tokens.ts` — soft-revoke token, pause all associated resources
- [ ] T058 [US1] Create CF API client in `apps/api/src/services/cloudflare/client.ts` — typed wrapper for CF REST + GraphQL APIs, handles auth headers, rate-limit backoff, error mapping
- [ ] T059 [US1] Implement `POST /resources/sync` in `apps/api/src/routes/resources.ts` — for each active CF token: call CF REST API to list zones, workers, R2 buckets, KV namespaces, D1 databases; upsert into resources table; mark removed ones inactive
- [ ] T060 [P] [US1] Implement `GET /resources` in `apps/api/src/routes/resources.ts` — list all monitored resources with status, type, last sync time
- [ ] T061 [P] [US1] Implement `PATCH /resources/:id` in `apps/api/src/routes/resources.ts` — update monitoring status (pause/resume)
- [ ] T062 [P] [US1] Implement `DELETE /resources/:id` in `apps/api/src/routes/resources.ts` — remove resource from monitoring

#### API — Route Registration

- [ ] T063 [US1] Register all auth, cf-token, and resource routes in `apps/api/src/index.ts` — mount route groups with appropriate middleware chains (public for auth, protected + RBAC for tokens/resources)

#### Web — Auth Pages

- [ ] T064 [P] [US1] Create registration page at `apps/web/src/routes/(auth)/register/+page.svelte` — form: name, email, password, confirm password; calls `POST /auth/register`; redirects to onboarding on success
- [ ] T065 [P] [US1] Create login page at `apps/web/src/routes/(auth)/login/+page.svelte` — form: email, password; calls `POST /auth/login`; redirects to dashboard on success
- [ ] T066 [P] [US1] Create forgot-password page at `apps/web/src/routes/(auth)/forgot-password/+page.svelte` — form: email; calls `POST /auth/forgot-password`; shows confirmation message
- [ ] T067 [P] [US1] Create reset-password page at `apps/web/src/routes/(auth)/reset-password/+page.svelte` — form: new password + confirm; reads token from URL; calls `POST /auth/reset-password`

#### Web — Onboarding Flow

- [ ] T068 [US1] Create onboarding layout at `apps/web/src/routes/(app)/onboarding/+layout.svelte` — step indicator (1: Connect CF, 2: Select Zones, 3: Done)
- [ ] T069 [US1] Create step 1 at `apps/web/src/routes/(app)/onboarding/connect/+page.svelte` — CF API token input, permission requirements listed, calls `POST /cf-tokens` then `POST /cf-tokens/:id/verify`
- [ ] T070 [US1] Create step 2 at `apps/web/src/routes/(app)/onboarding/zones/+page.svelte` — calls `POST /resources/sync`, displays discovered resources with checkboxes, user selects which to monitor
- [ ] T071 [US1] Create step 3 at `apps/web/src/routes/(app)/onboarding/success/+page.svelte` — celebration screen, "Go to Dashboard" CTA

#### Web — App Shell

- [ ] T072 [US1] Create authenticated layout at `apps/web/src/routes/(app)/+layout.svelte` — sidebar nav (Dashboard, Analytics, Anomalies, Rules, Integrations, Inventory, Billing, Settings, Audit), top bar with user avatar + notification bell, mobile-responsive
- [ ] T073 [US1] Create auth guard in `apps/web/src/routes/(app)/+layout.ts` — load function checks session via `GET /auth/me`, redirects to `/login` if unauthenticated

**Checkpoint**: User Story 1 complete — users can register, authenticate, connect CF tokens, and see monitored resources

---

## Phase 4: US2 — Dashboard & Analytics (Priority: P1)

**Goal**: User sees real-time overview dashboard with traffic metrics, cost estimates, and baseline comparisons

**Independent Test**: Log in → dashboard shows traffic charts, cost cards, top endpoints, baseline overlay, bot activity

### Implementation for User Story 2

#### API — Analytics Service

- [ ] T074 [US2] Create CF GraphQL query builder in `apps/api/src/services/cloudflare/graphql.ts` — typed functions for `httpRequests1mGroups`, `workersInvocationsAdaptive`, R2/KV/D1 adaptive queries; parameterized by zone/account tag, time range, limit
- [ ] T075 [US2] Create analytics service in `apps/api/src/services/analytics.ts` — orchestrates CF GraphQL queries + Analytics Engine reads + D1 snapshot/baseline lookups to build dashboard response objects

#### API — Analytics Routes

- [ ] T076 [P] [US2] Implement `GET /analytics/overview` in `apps/api/src/routes/analytics.ts` — total requests, cached %, estimated cost, active anomalies count, top-level summary for all monitored resources
- [ ] T077 [P] [US2] Implement `GET /analytics/traffic` in `apps/api/src/routes/analytics.ts` — time-series of requests (cached/uncached), filterable by zone, time range, interval
- [ ] T078 [P] [US2] Implement `GET /analytics/cost` in `apps/api/src/routes/analytics.ts` — cost breakdown by service (Workers, CDN, R2, KV, D1), daily/hourly aggregation
- [ ] T079 [P] [US2] Implement `GET /analytics/top-endpoints` in `apps/api/src/routes/analytics.ts` — top N endpoints by request count from CF GraphQL
- [ ] T080 [P] [US2] Implement `GET /analytics/geo` in `apps/api/src/routes/analytics.ts` — traffic by country from CF GraphQL `countryMap`
- [ ] T081 [P] [US2] Implement `GET /analytics/clients` in `apps/api/src/routes/analytics.ts` — user-agent distribution
- [ ] T082 [P] [US2] Implement `GET /analytics/baseline` in `apps/api/src/routes/analytics.ts` — current metric values vs. baseline (from baselines table), deviation percentage
- [ ] T083 [P] [US2] Implement `GET /analytics/bot-activity` in `apps/api/src/routes/analytics.ts` — detected bot user-agents with traffic share
- [ ] T084 [P] [US2] Implement `GET /analytics/performance` in `apps/api/src/routes/analytics.ts` — latency percentiles, slowest routes, error rate from CF GraphQL
- [ ] T085 [P] [US2] Implement `GET /analytics/errors` in `apps/api/src/routes/analytics.ts` — error breakdown by status code, time-series of error rates
- [ ] T086 [US2] Register analytics routes in `apps/api/src/index.ts` — mount under `/analytics` with auth + rate-limit middleware

#### Web — Dashboard

- [ ] T087 [P] [US2] Create dashboard overview at `apps/web/src/routes/(app)/dashboard/+page.svelte` — summary cards (total requests, cached %, estimated cost, active anomalies), zone selector dropdown
- [ ] T088 [P] [US2] Create traffic chart component at `apps/web/src/lib/components/charts/TrafficChart.svelte` — line chart (requests over time, cached vs uncached), uses lightweight chart lib (Chart.js or uPlot)
- [ ] T089 [P] [US2] Create cost breakdown component at `apps/web/src/lib/components/charts/CostBreakdown.svelte` — stacked bar or donut chart showing cost per service
- [ ] T090 [P] [US2] Create baseline overlay component at `apps/web/src/lib/components/charts/BaselineOverlay.svelte` — traffic vs baseline band visualization with deviation highlighting
- [ ] T091 [P] [US2] Create top endpoints component at `apps/web/src/lib/components/dashboard/TopEndpoints.svelte` — ranked list with request counts and % of total
- [ ] T092 [P] [US2] Create geo traffic component at `apps/web/src/lib/components/dashboard/GeoTraffic.svelte` — country list with traffic counts (or simple map)
- [ ] T093 [P] [US2] Create bot activity component at `apps/web/src/lib/components/dashboard/BotActivity.svelte` — bot user-agent list with traffic share percentages
- [ ] T094 [US2] Create analytics detail pages at `apps/web/src/routes/(app)/analytics/+page.svelte` — tabbed view (Traffic, Performance, Cost, Errors) rendering respective chart components with extended time-range controls
- [ ] T095 [US2] Wire dashboard page load function at `apps/web/src/routes/(app)/dashboard/+page.ts` — fetch overview, traffic, baseline, top-endpoints, bot-activity in parallel; pass to page as data

**Checkpoint**: User Story 2 complete — dashboard shows live traffic metrics, cost estimates, baselines, and attribution data

---

## Phase 5: US3 — Anomaly Detection & Alerts (Priority: P1)

**Goal**: System detects traffic anomalies using 3-layer detection, generates in-app alerts, and shows anomaly list with attribution

**Independent Test**: Simulated traffic spike → anomaly detected → alert appears in notification inbox → anomaly detail shows attribution breakdown

### Implementation for User Story 3

#### API — Detection Engine

- [ ] T096 [US3] Create threshold detector in `apps/api/src/services/detection/threshold.ts` — evaluate current metric value against user-defined rules (operator + threshold), return matched rules with severity
- [ ] T097 [US3] Create baseline detector in `apps/api/src/services/detection/baseline.ts` — compare current value to baseline avg/stddev, compute deviation, apply thresholds (2σ warning, 3σ high, 5σ critical)
- [ ] T098 [US3] Create velocity detector in `apps/api/src/services/detection/velocity.ts` — compute rate-of-change and acceleration across consecutive data points, flag rapid increases and sustained acceleration
- [ ] T099 [US3] Create attribution analyzer in `apps/api/src/services/detection/attribution.ts` — when anomaly detected, query CF GraphQL with dimension breakdowns (endpoint, user-agent, country, ASN), compute contribution percentages vs baseline
- [ ] T100 [US3] Create anomaly detection orchestrator in `apps/api/src/services/detection/index.ts` — runs all 3 layers, merges results, creates anomaly record in D1, enqueues alert-dispatch message to Queue

#### API — Alert Dispatch

- [ ] T101 [US3] Create alert deduplication service in `apps/api/src/services/alerts/dedup.ts` — KV-based check using `alert_dedup:{account}:{rule}:{resource}` key with TTL based on notify_frequency
- [ ] T102 [US3] Create email notification sender in `apps/api/src/services/alerts/channels/email.ts` — render HTML template with anomaly context, send via Resend API
- [ ] T103 [P] [US3] Create in-app notification sender in `apps/api/src/services/alerts/channels/in-app.ts` — insert notification row into D1 notifications table
- [ ] T104 [US3] Create alert dispatcher in `apps/api/src/services/alerts/dispatcher.ts` — fan out to enabled channels (email, in-app), record delivery status in alert_deliveries table, respect deduplication
- [ ] T105 [US3] Create Queue consumer handler in `apps/api/src/queues/alert-dispatch.ts` — consume `alert-dispatch` queue messages, call dispatcher; configure in wrangler.jsonc

#### API — Anomaly & Notification Routes

- [ ] T106 [P] [US3] Implement `GET /anomalies` in `apps/api/src/routes/anomalies.ts` — list anomalies with pagination, filterable by status/severity/resource, sorted by detected_at desc
- [ ] T107 [P] [US3] Implement `GET /anomalies/:id` in `apps/api/src/routes/anomalies.ts` — anomaly detail including attribution breakdown
- [ ] T108 [P] [US3] Implement `PATCH /anomalies/:id/dismiss` in `apps/api/src/routes/anomalies.ts` — set status to dismissed, record dismissed_by
- [ ] T109 [P] [US3] Implement `GET /notifications` in `apps/api/src/routes/notifications.ts` — in-app notification inbox, filterable by read/unread
- [ ] T110 [P] [US3] Implement `PATCH /notifications/:id/read` in `apps/api/src/routes/notifications.ts` — mark single notification as read
- [ ] T111 [P] [US3] Implement `POST /notifications/mark-all-read` in `apps/api/src/routes/notifications.ts` — mark all notifications as read for account
- [ ] T112 [US3] Register anomaly and notification routes in `apps/api/src/index.ts`

#### Web — Anomalies & Notifications

- [ ] T113 [P] [US3] Create anomalies list page at `apps/web/src/routes/(app)/anomalies/+page.svelte` — filterable table (severity, resource, status, detected time), dismiss action, click to detail
- [ ] T114 [US3] Create anomaly detail page at `apps/web/src/routes/(app)/anomalies/[id]/+page.svelte` — anomaly info card, attribution breakdown (contributors bar chart), metric vs baseline chart, dismiss button
- [ ] T115 [P] [US3] Create notification inbox component at `apps/web/src/lib/components/notifications/NotificationInbox.svelte` — dropdown from bell icon in top bar, lists recent notifications, mark-read/mark-all-read actions
- [ ] T116 [P] [US3] Create notification badge component at `apps/web/src/lib/components/notifications/NotificationBadge.svelte` — unread count badge on bell icon, polls or uses WebSocket

**Checkpoint**: complete — users can register, connect CF, view dashboard, and receive anomaly alerts

---

## Phase 6: US4 — Landing Page (Priority: P2)

**Goal**: Public marketing landing page with features, pricing, and CTA

**Independent Test**: Visit root URL → see hero, features, pricing tiers, footer → CTA leads to register

- [ ] T117 [P] [US4] Create landing layout at `apps/web/src/routes/(public)/+layout.svelte` — public nav bar (logo, Features, Pricing, Login, Sign Up), footer with legal links
- [ ] T118 [P] [US4] Create landing hero section at `apps/web/src/routes/(public)/+page.svelte` — headline, subtext, CTA button, hero illustration/screenshot
- [ ] T119 [P] [US4] Create features section component at `apps/web/src/lib/components/landing/Features.svelte` — grid of feature cards (monitoring, anomaly detection, alerts, attribution, guardian mode)
- [ ] T120 [P] [US4] Create pricing section component at `apps/web/src/lib/components/landing/Pricing.svelte` — Free / Pro / Team tier cards with feature comparison, CTA per tier
- [ ] T121 [P] [US4] Create footer component at `apps/web/src/lib/components/landing/Footer.svelte` — links, legal (Terms, Privacy), social

**Checkpoint**: Public-facing landing page complete

---

## Phase 7: US5 — Rules & Limits Management (Priority: P2)

**Goal**: Users create and manage monitoring rules with static thresholds

**Independent Test**: Create rule → see it listed → toggle on/off → edit threshold → delete rule

- [ ] T122 [P] [US5] Implement `GET /rules` in `apps/api/src/routes/rules.ts`
- [ ] T123 [P] [US5] Implement `POST /rules` in `apps/api/src/routes/rules.ts` — validate with CreateRuleSchema, enforce plan limits on rule count
- [ ] T124 [P] [US5] Implement `PATCH /rules/:id` in `apps/api/src/routes/rules.ts`
- [ ] T125 [P] [US5] Implement `PATCH /rules/:id/toggle` in `apps/api/src/routes/rules.ts`
- [ ] T126 [P] [US5] Implement `DELETE /rules/:id` in `apps/api/src/routes/rules.ts` — soft delete
- [ ] T127 [US5] Register rules routes in `apps/api/src/index.ts` with auth + RBAC(admin, editor) middleware
- [ ] T128 [P] [US5] Create rules list page at `apps/web/src/routes/(app)/rules/+page.svelte` — table with name, resource, metric, threshold, severity, enabled toggle, actions (edit/delete)
- [ ] T129 [US5] Create rule form modal at `apps/web/src/lib/components/rules/RuleFormModal.svelte` — create/edit form: name, resource type, resource (optional), metric, operator, threshold, window, severity, notify frequency

**Checkpoint**: Rules management complete — users can define custom monitoring thresholds

---

## Phase 8: US6 — Spike Attribution Detail (Priority: P2)

**Goal**: Enhanced attribution analysis showing contributor breakdown when viewing anomaly details

**Independent Test**: View anomaly detail → see contributor breakdown (endpoints, bots, countries, ASNs) with percentages and baseline comparison

- [ ] T130 [US6] Enhance attribution analyzer in `apps/api/src/services/detection/attribution.ts` — add ASN breakdown, compute change-from-baseline per contributor, rank by contribution %
- [ ] T131 [P] [US6] Create attribution bar chart component at `apps/web/src/lib/components/anomalies/AttributionChart.svelte` — horizontal bar chart showing top contributors with current vs baseline values
- [ ] T132 [P] [US6] Create contributor detail cards at `apps/web/src/lib/components/anomalies/ContributorCards.svelte` — expandable cards per contributor type (endpoint, bot, geo, ASN) with sparklines

**Checkpoint**: Attribution analysis provides actionable detail on anomaly causes

---

## Phase 9: US7 — Team Management (Priority: P2)

**Goal**: Account admins can invite team members, assign roles, manage access

**Independent Test**: Admin invites member by email → member receives invite → accepts → appears as active member → admin changes role → admin removes member

- [ ] T133 [P] [US7] Implement `GET /team/members` in `apps/api/src/routes/team.ts` — list active + pending members
- [ ] T134 [P] [US7] Implement `POST /team/invites` in `apps/api/src/routes/team.ts` — validate email, check plan limits, create pending team_member, send invite email via Resend
- [ ] T135 [P] [US7] Implement `PATCH /team/members/:id/role` in `apps/api/src/routes/team.ts` — admin only, cannot demote self
- [ ] T136 [P] [US7] Implement `DELETE /team/members/:id` in `apps/api/src/routes/team.ts` — admin only, cannot remove self
- [ ] T137 [P] [US7] Implement `POST /team/invites/:id/resend` in `apps/api/src/routes/team.ts` — resend invitation email
- [ ] T138 [US7] Create invite acceptance flow in `apps/api/src/routes/auth.ts` — handle invite token from email, link user to team_member record, set status to active
- [ ] T139 [US7] Register team routes in `apps/api/src/index.ts` with auth + RBAC(admin) middleware
- [ ] T140 [P] [US7] Create team management page at `apps/web/src/routes/(app)/team/+page.svelte` — member list table (name, email, role, status, last active), invite button, role change dropdown, remove action
- [ ] T141 [US7] Create invite member modal at `apps/web/src/lib/components/team/InviteMemberModal.svelte` — email input, role selector, send invite button

**Checkpoint**: Team management complete — multi-user access with RBAC

---

## Phase 10: US8 — Integrations (Priority: P2)

**Goal**: Users configure notification channels (Slack, Discord, PagerDuty, MS Teams, custom webhooks)

**Independent Test**: Configure Slack webhook → send test notification → receive message in Slack → configure custom webhook → test fires correctly

- [ ] T142 [P] [US8] Implement `GET /integrations` in `apps/api/src/routes/integrations.ts` — list all integrations with status
- [ ] T143 [P] [US8] Implement `POST /integrations/slack` in `apps/api/src/routes/integrations.ts` — validate webhook URL, encrypt, store
- [ ] T144 [P] [US8] Implement `POST /integrations/discord` in `apps/api/src/routes/integrations.ts`
- [ ] T145 [P] [US8] Implement `POST /integrations/pagerduty` in `apps/api/src/routes/integrations.ts`
- [ ] T146 [P] [US8] Implement `POST /integrations/teams` in `apps/api/src/routes/integrations.ts`
- [ ] T147 [P] [US8] Implement CRUD for `/integrations/webhooks` in `apps/api/src/routes/integrations.ts` — GET list, POST create, PATCH update, DELETE
- [ ] T148 [US8] Implement `POST /integrations/:type/test` in `apps/api/src/routes/integrations.ts` — send test notification to the configured channel
- [ ] T149 [US8] Create Slack notification sender in `apps/api/src/services/alerts/channels/slack.ts` — format Block Kit message with severity badge, metrics, attribution, dashboard link
- [ ] T150 [US8] Create Discord notification sender in `apps/api/src/services/alerts/channels/discord.ts` — format embed with color-coded severity
- [ ] T151 [P] [US8] Create PagerDuty sender in `apps/api/src/services/alerts/channels/pagerduty.ts` — Events API v2 incident creation
- [ ] T152 [P] [US8] Create MS Teams sender in `apps/api/src/services/alerts/channels/teams.ts` — Adaptive Card format
- [ ] T153 [P] [US8] Create custom webhook sender in `apps/api/src/services/alerts/channels/webhook.ts` — POST JSON payload to user-defined URL
- [ ] T154 [US8] Update alert dispatcher in `apps/api/src/services/alerts/dispatcher.ts` — fan out to all enabled channels (email, slack, discord, pagerduty, teams, webhooks, in-app)
- [ ] T155 [US8] Register integration routes in `apps/api/src/index.ts`
- [ ] T156 [P] [US8] Create integrations page at `apps/web/src/routes/(app)/integrations/+page.svelte` — grid of integration cards (Slack, Discord, PagerDuty, Teams, Email, Custom Webhooks) with connected/disconnected status, configure/test buttons
- [ ] T157 [US8] Create integration configure modal at `apps/web/src/lib/components/integrations/ConfigureModal.svelte` — dynamic form per integration type, webhook URL input, test button

**Checkpoint**: Notification integrations complete — alerts dispatched to external channels

---

## Phase 11: US9 — Infrastructure Inventory (Priority: P3)

**Goal**: Users see a comprehensive view of all CF resources being monitored with sync status

**Independent Test**: View inventory → see all zones, workers, R2 buckets, KV namespaces, D1 databases → trigger manual sync → see new resources appear → pause/resume monitoring on a resource

- [ ] T158 [P] [US9] Implement `GET /resources/:id` in `apps/api/src/routes/resources.ts` — resource detail with metadata, monitoring status, last snapshot
- [ ] T159 [US9] Create inventory page at `apps/web/src/routes/(app)/inventory/+page.svelte` — tabbed view by resource type (Zones, Workers, R2, KV, D1), table per tab with name, status, last synced, monitoring toggle, sync button
- [ ] T160 [US9] Create resource detail drawer at `apps/web/src/lib/components/inventory/ResourceDetail.svelte` — metadata, associated rules, recent anomalies, monitoring toggle

**Checkpoint**: Infrastructure inventory provides resource-level visibility

---

## Phase 12: US10 — Billing Overview (Priority: P3)

**Goal**: Users see estimated CF costs, budget thresholds, and cost drivers

**Independent Test**: View billing → see current spend, projected monthly, daily average → set budget threshold → see budget bar → view cost drivers → view invoice history

- [ ] T161 [P] [US10] Implement `GET /billing/overview` in `apps/api/src/routes/billing.ts` — current spend, projected monthly, daily average from billing_snapshots
- [ ] T162 [P] [US10] Implement `GET /billing/breakdown` in `apps/api/src/routes/billing.ts` — cost by service
- [ ] T163 [P] [US10] Implement `GET /billing/invoices` in `apps/api/src/routes/billing.ts` — invoice history list
- [ ] T164 [P] [US10] Implement `GET /billing/budget` and `PATCH /billing/budget` in `apps/api/src/routes/billing.ts` — get/set budget threshold
- [ ] T165 [P] [US10] Implement `GET /billing/top-drivers` in `apps/api/src/routes/billing.ts` — top cost drivers with amounts
- [ ] T166 [US10] Register billing routes in `apps/api/src/index.ts`
- [ ] T167 [P] [US10] Create billing overview page at `apps/web/src/routes/(app)/billing/+page.svelte` — spend cards, budget progress bar, cost breakdown chart, top drivers list, invoice table

**Checkpoint**: Billing visibility provides cost awareness and budget protection

---

## Phase 13: US11 — Audit Log (Priority: P3)

**Goal**: Account admins can review all system actions for compliance and debugging

**Independent Test**: Perform actions (create rule, invite member, etc.) → view audit log → see entries with user, action, timestamp → filter by action type → export CSV

- [ ] T168 [P] [US11] Implement `GET /audit-logs` in `apps/api/src/routes/audit-logs.ts` — paginated, filterable by user/action/entity/date range
- [ ] T169 [P] [US11] Implement `GET /audit-logs/export` in `apps/api/src/routes/audit-logs.ts` — generate CSV, stream response or store in R2 and return download URL
- [ ] T170 [US11] Register audit-log routes in `apps/api/src/index.ts` with auth + RBAC(admin) middleware
- [ ] T171 [US11] Create audit log page at `apps/web/src/routes/(app)/audit/+page.svelte` — filterable table (timestamp, user, action, entity, description), date range picker, export CSV button

**Checkpoint**: Audit log provides compliance trail

---

## Phase 14: US12 — Developer API (Priority: P3)

**Goal**: Users can create personal access tokens for programmatic API access

**Independent Test**: Create token → see token value (shown once) → token appears in list (masked) → use token to call API → revoke token → API call fails

- [ ] T172 [P] [US12] Implement `GET /developer/tokens` in `apps/api/src/routes/developer.ts` — list tokens with prefix, name, last used, created date
- [ ] T173 [P] [US12] Implement `POST /developer/tokens` in `apps/api/src/routes/developer.ts` — generate token, store SHA-256 hash + prefix in D1, return full token (shown once only)
- [ ] T174 [P] [US12] Implement `DELETE /developer/tokens/:id` in `apps/api/src/routes/developer.ts` — revoke token
- [ ] T175 [US12] Create API token auth middleware in `apps/api/src/middleware/api-token-auth.ts` — check `Authorization: Bearer <token>` header, hash token, lookup in developer_tokens, attach session context
- [ ] T176 [US12] Register developer routes in `apps/api/src/index.ts`; update auth middleware to support both session cookie and Bearer token
- [ ] T177 [US12] Create developer settings page at `apps/web/src/routes/(app)/settings/developer/+page.svelte` — token list table, create token button, reveal-once modal, revoke action

**Checkpoint**: Developer API enables programmatic access

---

## Phase 15: US13 — Guardian Mode (Priority: P4)

**Goal**: Automated mitigation rules that trigger CF API actions when critical thresholds are exceeded

**Independent Test**: Create mitigation rule (e.g., enable Under Attack Mode when requests > 100k/min) → simulate trigger → CF API action fires → mitigation logged → manual trigger works

- [ ] T178 [P] [US13] Implement `GET /mitigations` in `apps/api/src/routes/mitigations.ts`
- [ ] T179 [P] [US13] Implement `POST /mitigations` in `apps/api/src/routes/mitigations.ts` — validate trigger condition + action config
- [ ] T180 [P] [US13] Implement `PATCH /mitigations/:id` and `PATCH /mitigations/:id/toggle` in `apps/api/src/routes/mitigations.ts`
- [ ] T181 [P] [US13] Implement `DELETE /mitigations/:id` in `apps/api/src/routes/mitigations.ts`
- [ ] T182 [US13] Implement `POST /mitigations/:id/trigger` in `apps/api/src/routes/mitigations.ts` — manually execute mitigation action
- [ ] T183 [US13] Create mitigation executor in `apps/api/src/services/mitigation/executor.ts` — execute CF REST API actions: enable Under Attack Mode, apply rate-limit rule, block user-agent, pause worker
- [ ] T184 [US13] Integrate mitigation trigger into anomaly detection orchestrator `apps/api/src/services/detection/index.ts` — when anomaly matches active mitigation rule, enqueue mitigation action
- [ ] T185 [US13] Register mitigation routes in `apps/api/src/index.ts`
- [ ] T186 [P] [US13] Create mitigations page at `apps/web/src/routes/(app)/mitigations/+page.svelte` — table with name, trigger, action, enabled toggle, last triggered, savings, actions
- [ ] T187 [US13] Create mitigation form modal at `apps/web/src/lib/components/mitigations/MitigationFormModal.svelte` — trigger type, condition builder, action type selector, action config

**Checkpoint**: Guardian Mode enables automated cost protection

---

## Phase 16: Auth Extensions (Priority: P3)

**Purpose**: OAuth login + email verification

- [ ] T188 [P] Implement `GET /auth/oauth/:provider` in `apps/api/src/routes/auth.ts` — initiate PKCE OAuth flow for Google/GitHub, store code_verifier in KV, redirect to provider
- [ ] T189 [P] Implement `GET /auth/oauth/:provider/callback` in `apps/api/src/routes/auth.ts` — exchange code for token, fetch user profile, match/create user, create session
- [ ] T190 Create email verification flow in `apps/api/src/routes/auth.ts` — on register: send verification email via Resend with token (KV, 24h TTL); `GET /auth/verify-email?token=` to confirm
- [ ] T191 [P] Add Google OAuth button to login/register pages in `apps/web/src/routes/(auth)/login/+page.svelte` and `register/+page.svelte`
- [ ] T192 [P] Add GitHub OAuth button to login/register pages

**Checkpoint**: Extended auth with OAuth and email verification

---

## Phase 17: Settings (Priority: P3)

**Purpose**: User profile, notification preferences, account settings

- [ ] T193 [P] Implement `GET /settings/profile` and `PATCH /settings/profile` in `apps/api/src/routes/settings.ts`
- [ ] T194 [P] Implement `PATCH /settings/password` in `apps/api/src/routes/settings.ts` — verify current password, hash new password, update
- [ ] T195 [P] Implement `GET /settings/notifications` and `PATCH /settings/notifications` in `apps/api/src/routes/settings.ts` — per-channel preferences
- [ ] T196 [P] Implement `GET /settings/account` and `PATCH /settings/account` in `apps/api/src/routes/settings.ts` — account name, timezone, defaults
- [ ] T197 Register settings routes in `apps/api/src/index.ts`
- [ ] T198 [P] Create settings profile page at `apps/web/src/routes/(app)/settings/profile/+page.svelte` — name, email, avatar, change password form
- [ ] T199 [P] Create notification preferences page at `apps/web/src/routes/(app)/settings/notifications/+page.svelte` — toggle per channel, default severity, digest preferences
- [ ] T200 [P] Create account settings page at `apps/web/src/routes/(app)/settings/account/+page.svelte` — account name, timezone, danger zone (delete account)

**Checkpoint**: Settings pages complete

---

## Phase 18: Real-time Dashboard (Priority: P4)

**Purpose**: WebSocket-based live updates via Durable Objects

- [ ] T201 Create Durable Object class `AccountLiveFeed` in `apps/api/src/durable-objects/live-feed.ts` — manages WebSocket connections per account, broadcasts metric updates and anomaly alerts
- [ ] T202 Implement `GET /ws` upgrade route in `apps/api/src/routes/ws.ts` — authenticate session, get DO stub by account_id, upgrade to WebSocket
- [ ] T203 Update metrics poll worker to push new data to Durable Object after each poll cycle
- [ ] T204 Create WebSocket store in `apps/web/src/lib/stores/websocket.ts` — Svelte 5 runes store that connects to `/ws`, parses messages, updates dashboard data reactively
- [ ] T205 Update dashboard components to consume WebSocket store — live-updating cards and charts without polling

**Checkpoint**: Dashboard updates in real-time

---

## Phase 19: Cron Jobs (Priority: P2)

**Purpose**: Scheduled workers for automated monitoring, baselines, digests, sync, and cleanup

- [ ] T206 Implement metrics-poll cron in `apps/api/src/crons/metrics-poll.ts` — every 5min: iterate active accounts, decrypt tokens, query CF GraphQL, write to Analytics Engine, upsert zone_snapshots, enqueue anomaly-check messages
- [ ] T207 [P] Implement baseline-recalc cron in `apps/api/src/crons/baseline-recalc.ts` — every 6h: query Analytics Engine for 28-day window, compute avg/stddev per (resource, metric, hour, day_of_week), upsert baselines table
- [ ] T208 [P] Implement daily-digest cron in `apps/api/src/crons/daily-digest.ts` — 8 AM UTC: for each account with digest enabled, summarize last 24h anomalies + billing, render HTML, send via Resend
- [ ] T209 [P] Implement resource-sync cron in `apps/api/src/crons/resource-sync.ts` — every 12h: call CF REST API per account, sync resources table
- [ ] T210 [P] Implement housekeeping cron in `apps/api/src/crons/housekeeping.ts` — 3 AM UTC: delete old snapshots (per plan retention), purge soft-deleted records > 30d, archive old notifications
- [ ] T211 Register cron handlers in `apps/api/src/index.ts` export `scheduled` handler; configure cron triggers in `apps/api/wrangler.jsonc`
- [ ] T212 Create Queue consumer in `apps/api/src/queues/anomaly-check.ts` — consume anomaly-check messages from metrics poll, run detection orchestrator

**Checkpoint**: Automated background processing fully operational

---

## Phase 20: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T213 [P] Add loading skeletons to all dashboard and list pages in `apps/web/src/lib/components/ui/Skeleton.svelte`
- [ ] T214 [P] Add empty states for all list pages (no anomalies, no rules, no integrations, etc.)
- [ ] T215 [P] Add toast notification system in `apps/web/src/lib/components/ui/Toast.svelte` — success/error/info toasts for form submissions
- [ ] T216 [P] Add responsive mobile navigation in `apps/web/src/lib/components/layout/MobileNav.svelte` — hamburger menu, slide-out sidebar
- [ ] T217 Create error boundary pages in `apps/web/src/routes/+error.svelte` — 404, 500, generic error with retry
- [ ] T218 [P] Add plan-limit enforcement across API routes — check account plan tier before allowing resource/rule/team creation; return 402 with upgrade prompt
- [ ] T219 [P] Add pagination component at `apps/web/src/lib/components/ui/Pagination.svelte` — reusable for all list pages
- [ ] T220 Security hardening pass — verify all CF tokens encrypted, all inputs validated, no XSS vectors in rendered content, CSRF protection on all mutations, rate limits on all endpoints
- [ ] T221 Performance optimization — add KV caching for frequently read data (analytics overview, resource list), cache-control headers, SvelteKit preloading

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **US1 Account + CF (Phase 3)**: Depends on Phase 2 — first user story, provides auth infrastructure used by all others
- **US2 Dashboard (Phase 4)**: Depends on Phase 2 + CF client from US1 (T058)
- **US3 Anomalies (Phase 5)**: Depends on Phase 2 + CF client from US1 (T058) + analytics service from US2 (T075)
- **US4 Landing (Phase 6)**: Depends on Phase 1 only — can be built in parallel with Phases 3–5
- **US5–US13 (Phases 7–15)**: Depend on Phase 2 foundation; some integrate with earlier stories but are independently testable
- **Cron Jobs (Phase 19)**: Depends on US1 (CF client), US3 (detection engine), US8 (notification channels)
- **Real-time (Phase 18)**: Depends on Phase 19 (cron metric polling) and Phase 2 (middleware)
- **Polish (Phase 20)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Standalone after Phase 2 — provides auth used by everything
- **US2 (P1)**: Needs CF client (T058 from US1) but otherwise independent
- **US3 (P1)**: Needs CF client (T058) + analytics service (T075 from US2)
- **US4 (P2)**: Fully independent — public pages only
- **US5 (P2)**: Independent after Phase 2
- **US6 (P2)**: Extends US3 attribution (T099)
- **US7 (P2)**: Independent after Phase 2
- **US8 (P2)**: Extends US3 alert dispatch (T104)
- **US9 (P3)**: Extends US1 resources
- **US10 (P3)**: Independent after Phase 2
- **US11 (P3)**: Independent after Phase 2 (uses audit middleware T043)
- **US12 (P3)**: Independent after Phase 2
- **US13 (P4)**: Needs CF client (T058) + detection engine (T100 from US3)

### Within Each User Story

- Repositories before services
- Services before API routes
- API routes before web pages
- Core implementation before integration with other stories

### Parallel Opportunities

- All Phase 1 tasks marked [P] can run in parallel
- All Phase 2 repositories (T016–T031) can run in parallel
- All Phase 2 middleware (T035–T043) can run in parallel after T032–T034
- US4 (Landing) can be built entirely in parallel with phases
- US5, US7, US10, US11, US12 are independent and can be built in parallel after Phase 2
- Within each phase, all tasks marked [P] can run in parallel

---

## Implementation Strategy

### First (Phases 1–5)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: US1 Account + CF Connection
4. Complete Phase 4: US2 Dashboard + Analytics
5. Complete Phase 5: US3 Anomaly Detection + Alerts
6. **STOP and VALIDATE**: Full loop testable end-to-end
7. Deploy to Cloudflare Workers

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test auth + CF → Deploy (skeleton app)
3. Add US2 → Test dashboard → Deploy (monitoring visible)
4. Add US3 → Test anomalies → Deploy
5. Add US4 → Landing page → Deploy (marketable)
6. Add US5+US7+US8 → Rules + Team + Integrations → Deploy (collaboration)
7. Add remaining stories → Deploy (full product)

### Critical Path

```
Phase 1 → Phase 2 → T058 (CF client) → T075 (analytics svc) → T100 (detection engine)
                  ↘ T048-T053 (auth routes) → T063 (route registration)
                  ↘ T064-T073 (web pages)
```

The CF client (T058) is the most critical shared dependency — it unblocks both dashboard analytics and anomaly detection.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- Password hashing: use `bcryptjs` NOT `@noble/hashes/argon2` (too slow on Workers ~14s)
- All D1 queries must be scoped by `account_id` via repository pattern
- Zod 4.x used for validation (already in deps)
- SvelteKit uses Svelte 5 runes (`$state`, `$derived`, `$effect`) — no legacy `$:` or stores
- Analytics Engine for time-series, D1 for relational data — never mix concerns
- CF API tokens encrypted with AES-256-GCM via `crypto.subtle`
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
