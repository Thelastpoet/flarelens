# Frontend Anti-Pattern Inventory

## Scope

This inventory captures implementation patterns in `apps/web` that are acceptable in a mock/demo phase but unsafe for a production multi-tenant SaaS.

## A1. Mixed Route Loading Models Without a Rule

- Observed:
  - authenticated routes mix `+page.ts`, `+page.server.ts`, and layout-level loading without a strict boundary.
- Risk:
  - server/client behavior diverges by route and runtime context.
- Impact:
  - hard-to-reproduce route failures and inconsistent error behavior.

## A2. API Transport Logic Coupled to Route/UI Layers

- Observed:
  - route loaders and page components both own transport assumptions.
- Risk:
  - every route can reintroduce fetch/path/runtime defects.
- Impact:
  - repeated bugs in SSR and hydration behavior.

## A3. Missing Route-Level Normalization

- Observed:
  - backend payloads are passed to pages/components with minimal shaping.
- Risk:
  - components crash when data is partial, null, or shape-shifted.
- Impact:
  - hydration runtime failures (`.find`, `.toFixed`, similar).

## A4. Presentation Components Know Raw Backend Contracts

- Observed:
  - dashboard/analytics components calculate with fields that are not guaranteed.
- Risk:
  - visual rendering depends on backend contract details leaking into UI components.
- Impact:
  - brittle rendering under real customer data.

## A5. Inconsistent Error Strategy Across Loaders

- Observed:
  - some routes use `Promise.allSettled` and render partial data; others fail hard.
- Risk:
  - same class of backend issue yields totally different UX per route.
- Impact:
  - non-deterministic behavior and poor operability.

## A6. Blocking Work in First Render Path

- Observed:
  - onboarding zones has historically mixed sync work with initial rendering concerns.
- Risk:
  - long waits appear as blank/frozen pages.
- Impact:
  - users perceive the app as broken even when API calls succeed.

## A7. Route Pages Doing Too Much Domain Logic

- Observed:
  - pages often handle transport + mapping + derivation + render decisions.
- Risk:
  - no reusable domain/view-model layer.
- Impact:
  - bug fixes require touching many pages independently.

## A8. Incomplete Interactive State Contracts

- Observed:
  - mutation/invalidation patterns vary by page and are not standardized.
- Risk:
  - optimistic or post-action state can desynchronize from server state.
- Impact:
  - unpredictable UI after actions.

## A9. Onboarding Embedded in Authenticated App Shell

- Observed:
  - onboarding routes currently live within `(app)` shell context.
- Risk:
  - first-run flow feels secondary and inherits unrelated shell failures.
- Impact:
  - poor first-time experience and harder troubleshooting.

## A10. No Formal Route Contract Test Matrix

- Observed:
  - there is no frontend route-level contract checklist proving each route is render-safe under live data.
- Risk:
  - regressions reappear after deploy with new customer data.
- Impact:
  - repeated production firefighting.

## Production Rule

No authenticated route should be considered complete unless:

- server load path is deterministic
- route-level data is normalized
- component inputs are render-safe by construction
- empty/partial/error states are explicit
