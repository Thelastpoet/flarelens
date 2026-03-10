# Frontend Integration Plan

## Goal

Swap the existing frontend from mock/demo data to the real API while preserving the current UI exactly, and fix frontend implementation/accessibility issues in parallel where they affect the same surface.

## Execution Order

1. Audit every app route and shared layout dependency.
2. Remove direct imports from `lib/data/mock.ts` where backend data already exists.
3. Replace page-local mock structures with loader-driven data from `/api/*`.
4. Fix local implementation and accessibility issues on the same surface while wiring it.
5. Identify backend gaps where the UI expects unsupported data or mutations.
6. Record those gaps without redesigning the screens.

## Priority Order

### Phase 1: Shared Shell

- Replace mock account/user data in:
  - `apps/web/src/lib/components/layout/Sidebar.svelte`
  - other shared shell components that should read from authenticated layout data
- Confirm the `(app)` layout data is sufficient for account/user identity display.
- Audit header/sidebar interactive controls for keyboard and accessibility semantics.

### Phase 2: Pages Already Partly Wired

- Dashboard
- Analytics
- Anomalies
- Anomaly detail
- Onboarding connect
- Onboarding zones

These pages already touch the API and should be cleaned first so partially mocked widgets do not drift.
These pages should also lose their demo-only trend/fallback sections as real data is wired in.

### Phase 3: UI-Only Management Pages

- Inventory
- Billing
- Integrations
- Notifications
- Rules
- Mitigations
- Team
- Settings
- Audit
- Developer

For each page:
- add loader/actions only where the backend exists
- keep the exact current layout and presentation
- fix obvious fake-interaction or accessibility issues while touching that page
- mark missing backend support explicitly

## Deliverables

- route-by-route integration status
- explicit mock removal list
- backend gap list for frontend-blocked features
- implementation order for the actual wiring pass
