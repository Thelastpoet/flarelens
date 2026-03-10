# Tasks: Frontend Production Remediation

## Purpose

Track the architecture-level frontend fixes needed to make `apps/web` production-safe for multi-tenant usage.

## Working Rules

- Preserve current UI design unless a behavior fix requires minor UX affordance changes.
- Do not patch runtime symptoms directly in page components without updating route-level contracts.
- Prefer server-owned loading and route-level normalization over client-side defensive patching.
- Commit after each coherent phase or sub-phase.

## Phase 1: Foundation (Blocking)

- [ ] FP001 Create `apps/web/src/lib/server/` with shared server fetch helpers and typed route result helpers.
- [ ] FP002 Define a standard route view-model pattern (`raw -> normalized -> page props`) and document it in `apps/web/src/lib/server/README.md`.
- [ ] FP003 Add a shared `normalizeNumber`/`normalizeArray`/`normalizePercent` utility for route adapters in `apps/web/src/lib/server/normalize.ts`.
- [ ] FP004 Enforce server-only loading for high-risk authenticated routes (`+page.server.ts` migration baseline for dashboard/analytics/settings/inventory).

Checkpoint: no crash-surface route should still depend on ad hoc universal-loading behavior.

## Phase 2: Crash Surface Migration

### Dashboard

- [ ] FP005 Move dashboard loader from `apps/web/src/routes/(app)/dashboard/+page.ts` to `+page.server.ts`.
- [ ] FP006 Create `apps/web/src/lib/server/dashboard.ts` to fetch and normalize all dashboard dependencies.
- [ ] FP007 Update `apps/web/src/routes/(app)/dashboard/+page.svelte` to consume only normalized view-model fields (no direct contract assumptions).

### Analytics

- [ ] FP008 Move analytics loader from `apps/web/src/routes/(app)/analytics/+page.ts` to `+page.server.ts`.
- [ ] FP009 Create `apps/web/src/lib/server/analytics.ts` to normalize traffic/geo/clients/endpoints/performance/errors.
- [ ] FP010 Update `apps/web/src/routes/(app)/analytics/+page.svelte` and dependent components to remove raw `.toFixed` and similar assumptions on optional fields.

### Settings and Inventory

- [ ] FP011 Move settings loader to server-only route loading and map responses through `apps/web/src/lib/server/settings.ts`.
- [ ] FP012 Move inventory loader to server-only route loading and map responses through `apps/web/src/lib/server/inventory.ts`.
- [ ] FP013 Standardize route-level error fallback behavior for settings/inventory (render-safe route state, no hard crash).

Checkpoint: dashboard, analytics, settings, and inventory must render safely with partial/empty live data and no hydration crash.

## Phase 3: Management Route Standardization

- [ ] FP014 Migrate `billing`, `rules`, `integrations`, `mitigations`, `team`, `notifications`, `audit`, `developer`, `anomalies`, `anomalies/[id]` loaders to the same server-adapter pattern.
- [ ] FP015 Add per-route adapter modules under `apps/web/src/lib/server/` for each management route.
- [ ] FP016 Remove direct backend-shape assumptions from page components; rely on adapter contracts only.
- [ ] FP017 Define and implement a consistent per-route failure policy:
  - render partial state where safe
  - show explicit unavailable state where not safe
  - avoid route-level unhandled exceptions

Checkpoint: all authenticated app routes follow the same loading and normalization contract.

## Phase 4: Onboarding Architecture Correction

- [ ] FP018 Move onboarding to a dedicated layout flow outside operational dashboard shell concerns.
- [ ] FP019 Ensure onboarding zone/resource sync work does not block first meaningful render.
- [ ] FP020 Define explicit onboarding states: `connecting`, `syncing`, `ready`, `no-resources`, `retry`.

Checkpoint: first-run experience is operationally isolated and does not depend on dashboard stability.

## Phase 5: Verification and Guardrails

- [ ] FP021 Add a route smoke checklist document under `dev_docs/frontend-production-audit/` covering all authenticated routes under real account data.
- [ ] FP022 Add frontend tests or scripted checks for crash-prone normalization points (dashboard/analytics numeric and array fields).
- [ ] FP023 Run and record verification:
  - `pnpm --filter web check`
  - deployed smoke on `/dashboard`, `/analytics`, `/settings`, `/inventory`, onboarding flow
- [ ] FP024 Add a release gate note: no frontend deploy without passing route smoke checklist.

## Dependencies & Order

1. Phase 1 blocks all later phases.
2. Phase 2 must complete before broad management route migration.
3. Phase 3 and Phase 4 can run in parallel after Phase 2.
4. Phase 5 closes the remediation track.

## Exit Criteria

- No authenticated route fails with full-page `500` due to loader integration architecture.
- No page blanks after initial render due to hydration crashes caused by unnormalized data.
- All authenticated routes use server-owned adapters and normalized view-model contracts.
- Onboarding is no longer an operationally fragile sub-flow inside dashboard behavior.
