# Tasks: Frontend Integration

## Purpose

This file tracks the frontend work required to replace mock data with live backend data while preserving the current UI exactly.

## Working Rules

- Do not redesign screens during data wiring.
- Remove mock data only when the replacement contract is understood.
- If the backend is missing a required UI contract, record the gap instead of inventing a frontend-only workaround.

## Tasks

### Phase 1: Shared Shell

- [ ] F001 Replace mock account and user data in `apps/web/src/lib/components/layout/Sidebar.svelte`
  Status: still open. The active shell is `AppShell.svelte`, but the older `Sidebar.svelte` component still imports mock data and should be cleaned or retired.
- [x] F002 Confirm `(app)` layout data shape is sufficient for shared shell identity display
  Outcome: passed. `(app)/+layout.ts` now provides authenticated user plus account data that can drive the active shell.
- [x] F003 Audit shared notification UI (`NotificationBadge`, `NotificationInbox`, stores) against `/notifications`
  Outcome: partial-but-usable. The active shell now reads unread notification count from the backend at layout level; older notification components still need a usage cleanup pass.
- [x] F024 Replace hardcoded avatar/account shell values in `AppShell.svelte` or consolidate shell identity to one source
  Outcome: passed. `AppShell.svelte` now uses live authenticated layout data for account name, plan label, and avatar initials.
- [ ] F025 Review shell controls for accessibility semantics (`aria-expanded`, focus handling, dismiss behavior)
  Status: in progress. Menu button semantics were improved in `AppShell.svelte`, but the full shell interaction review is not complete yet.

### Phase 2: Already Loader-Backed Screens

- [x] F004 Remove remaining hardcoded summary/trend values from `dashboard/+page.svelte`
  Outcome: passed. Dashboard stat cards now derive their status labels from live overview/baseline data instead of fixed percentages.
- [x] F005 Remove hardcoded recent-activity items from `dashboard/+page.svelte` or mark backend gap if no matching feed exists
  Outcome: passed. The recent-activity panel now uses live overview signals instead of demo timeline copy.
- [x] F006 Confirm all dashboard widgets degrade cleanly with real empty-state data
  Outcome: passed for the current dashboard surface. The dashboard now renders honest empty or unavailable states rather than fake success data.
- [ ] F007 Remove analytics-page fallback demo visuals where real API data should drive the widget
- [ ] F008 Confirm anomaly list and detail routes cover the current UI states without local-only assumptions
- [ ] F026 Remove or replace analytics-page static fallback visuals where they misrepresent real empty-state data
- [ ] F027 Review tabs, filters, toggles, and modal patterns on touched pages for keyboard/accessibility correctness

### Phase 3: Management Screens With Existing Backend Support

- [x] F009 Wire inventory page to `/resources`
  Outcome: passed for the current inventory surface. The page now loads real resources, derives active-rule counts from `/rules`, supports sync/pause/resume/remove actions, and replaces the mock table with honest empty states.
- [x] F010 Wire rules page to `/rules`
  Outcome: passed for the current rules surface. The page now loads real rules and resources, supports create/toggle/delete flows, and replaces the fake custom-rules banner with an honest backend-scope note.
- [x] F011 Wire integrations page to `/integrations/*`
  Outcome: passed for the current integrations surface. The page now reflects live connection state, supports create/test/delete flows for supported integrations, and replaces fake connection badges with backend-backed status.
- [x] F012 Wire team page to `/team/*`
  Outcome: passed for the current team-management surface. The page now loads real members, supports invite/resend/role-change/remove flows, and replaces the mock member/invite lists with backend-backed state.
- [x] F013 Wire notifications page to `/notifications`
  Outcome: passed for the current inbox surface. The notifications page now uses a real page loader, renders live notification records, and supports mark-all, archive-all, and per-item mark-read actions without mock content.
- [x] F014 Wire mitigations page to `/mitigations/*`
  Outcome: passed for the current mitigation surface. The page now loads real mitigation rules, supports create/edit/toggle/delete/dry-run flows, and replaces the mock cards with backend-backed execution state.
- [x] F015 Wire audit page to `/audit-logs`
  Outcome: passed for the current audit surface. The page now loads real audit logs, supports action/date filtering plus CSV export, and replaces the fake log history with backend-backed data.
- [x] F016 Wire developer page to `/developer/*`
  Outcome: passed for the current developer surface. The page now loads real developer tokens plus webhook endpoints, supports token creation/revocation and webhook creation/removal, and removes the fake bearer-auth API quickstart claim.
- [x] F017 Wire billing page to `/billing/*` using estimate-based backend semantics
  Outcome: passed for the current billing surface. The page now uses real billing endpoints, makes estimate-backed data explicit, supports budget-limit updates, and removes fake invoice-grade breakdown content.

### Phase 4: Settings and Profile

- [ ] F018 Replace mock profile data in `settings/+page.svelte`
- [x] F018 Replace mock profile data in `settings/+page.svelte`
  Outcome: passed for identity display. The settings page now reads authenticated user name and email from layout data instead of `lib/data/mock.ts`.
- [ ] F019 Map settings page sections to real backend routes (`/auth/me`, `/settings`, related account settings APIs)
- [ ] F020 Record backend gaps for unsupported settings actions such as avatar/password/preferences if the API contract is missing

### Phase 5: Onboarding and Auth Validation

- [ ] F021 Confirm onboarding connect uses the exact live token payload/response shape
- [ ] F022 Confirm onboarding zones uses the exact `/resources` response shape and zone-selection behavior
- [ ] F023 Validate auth pages against the live backend contracts and identify any password-reset gaps

### Phase 6: Frontend Quality Hardening

- [ ] F028 Audit custom switch/button/tab controls and add missing accessibility state where needed
- [ ] F029 Audit modal/backdrop patterns for close behavior and focus management
- [ ] F030 Audit fake or local-only interactions on management pages and classify them as real wiring work or backend gaps
- [ ] F031 Remove remaining demo-only sections that survive after data wiring
- [ ] F032 Run final `pnpm --filter web check` after each completed page slice

## Current Audit Findings

- `Sidebar.svelte` still imports `account` and `currentUser` from `lib/data/mock.ts`
- `settings/+page.svelte` still imports `currentUser` from `lib/data/mock.ts`
- The active authenticated shell now uses real layout data for account identity and unread notification count
- The notifications page is now backend-backed, but page-level pagination is still a follow-up gap if the inbox grows beyond the first page
- The inventory page is now backend-backed; pagination is still visual-only because the `/resources` API is not paginated
- The rules page is now backend-backed; rule editing is not yet surfaced because the current UI only has create, toggle, and delete affordances
- The integrations page is now backend-backed; webhook header editing and non-default PagerDuty severity mapping are not yet surfaced in the current UI
- The team page is now backend-backed; invite sender identity is not exposed by the current team API, so the recent-invites list uses neutral copy instead of fake inviter names
- The mitigations page is now backend-backed; confirmed live execution is still intentionally not exposed in the current UI, which keeps manual actions in dry-run mode
- The billing page is now backend-backed; period selection and invoice downloads are not surfaced because the current backend only exposes current summary/budget plus stored invoice snapshots
- The audit page is now backend-backed; user-specific filtering is not surfaced because the current UI has no user directory input and the API only supports raw `user_id` filters
- The developer page is now backend-backed; the UI explicitly documents that generated developer tokens are managed inventory and not an active public bearer-auth API surface
- Dashboard and analytics pages have live loaders but still contain hardcoded trend badges, fallback visual content, or static activity sections
- The frontend currently passes `pnpm --filter web check`, so the main remaining quality issues are product-level and accessibility-level rather than compiler errors
- Most management pages (`billing`, `inventory`, `integrations`, `rules`, `team`, `audit`, `developer`, `mitigations`, `notifications`) are still UI-only with no page loader or server actions
- `onboarding/connect` already matches the current backend token contract (`{ label, token }`)
- `onboarding/zones` already hits `/resources/sync` and `/resources`, but the UI still needs a full route-level audit during implementation

## Exit Criteria

- [ ] no production app page depends on `lib/data/mock.ts`
- [ ] every current app screen is classified as backend-backed or explicitly blocked by a backend gap
- [ ] all loader-backed screens preserve the current UI while using real API data
- [ ] backend gaps needed by the existing UI are documented separately
