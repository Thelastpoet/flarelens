# Frontend Remediation Architecture Plan

## Objective

Refactor the frontend integration layer so the app is production-safe for real customer accounts and multiple teams.

This is not a redesign plan. The visual UI should remain intact.

## Target Structure

### 1. Server-Only Route Loading

Move app-page data fetching toward:

- `+layout.server.ts`
- `+page.server.ts`

Use server routes for:

- authenticated backend calls
- orchestration
- error handling
- normalization

Avoid relying on mixed universal-load behavior for core authenticated pages.

### 2. Route-Level View Models

Add `apps/web/src/lib/server/` modules such as:

- `dashboard.ts`
- `analytics.ts`
- `settings.ts`
- `inventory.ts`
- `billing.ts`

Each module should:

- fetch backend data
- validate or normalize it
- return a stable page-specific view model

Pages should receive only this normalized shape.

### 3. Presentation-Only Components

Svelte components should not know raw backend contracts.

They should receive:

- arrays that are always arrays
- numeric fields that are already normalized
- derived percentages already computed or safely defaulted
- empty/error-safe structures

### 4. Explicit Route States

Every route should support:

- loading
- empty
- partial data
- backend unavailable
- feature unavailable

No route should crash because one optional backend field is missing.

### 5. Client-Side Mutations Only for Interactions

Keep client-side behavior for:

- form submission
- optimistic UI where justified
- invalidation/refresh
- dialogs and interactive controls

Do not let client components become transport or normalization layers.

## Migration Order

### Phase 1: Architecture Foundation

1. Introduce `src/lib/server/` route services
2. Define shared fetch/normalization helpers for server routes
3. Standardize route-level error handling

### Phase 2: Crash Surfaces First

1. Dashboard
2. Analytics
3. Settings
4. Inventory

These four routes should become the reference implementation for the new pattern.

### Phase 3: Remaining Management Pages

1. Billing
2. Rules
3. Integrations
4. Mitigations
5. Team
6. Notifications
7. Audit
8. Developer
9. Anomalies

### Phase 4: Onboarding

1. Move onboarding out of the app shell
2. Make onboarding rendering independent of resource-sync blocking work
3. keep the existing design language while making it operationally safe

## Definition of Done

The frontend should be considered production-ready only when:

- main authenticated routes no longer throw SSR `500` errors
- hydration completes without runtime crashes on real account data
- route data is normalized before reaching UI components
- loading/error/empty states are explicit
- onboarding is operationally and visually separate from the main app shell
- browser-level smoke checks cover the core app routes

## Rule Going Forward

No new backend wiring should bypass the route-level server normalization layer.

If a page needs raw backend payload knowledge inside the component tree, the architecture boundary is already being broken.
