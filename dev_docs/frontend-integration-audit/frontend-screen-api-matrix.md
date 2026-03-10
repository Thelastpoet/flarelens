# Frontend Screen API Matrix

## Legend

- `Live`: page already has a real API loader or action path
- `Mixed`: page has some real API data but still contains hardcoded/demo UI content
- `Mock`: page is effectively UI-only or depends on `lib/data/mock.ts`
- `Gap`: backend support appears missing or needs confirmation

## Shared Shell

| Surface | Current State | Current Source | Target |
| --- | --- | --- | --- |
| `(app)` layout auth guard | Live | `/api/auth/me` in `routes/(app)/+layout.ts` | Keep |
| Sidebar account/user block | Mock | `lib/data/mock.ts` | Replace with layout/user/account data |
| Top-level notifications badge/inbox | Needs audit in implementation pass | likely store/API mix | confirm against `/notifications` |

## App Routes

| Route | State | Current Data Source | Likely Backend Source | Notes |
| --- | --- | --- | --- | --- |
| `/dashboard` | Mixed | loader + hardcoded presentation | `/analytics/overview`, `/analytics/traffic`, `/analytics/baseline`, `/analytics/top-endpoints`, `/analytics/bot-activity` | live loader exists, UI still needs cleanup for hardcoded summary blocks |
| `/analytics` | Mixed | loader-backed | `/analytics/traffic`, `/analytics/geo`, `/analytics/clients`, `/analytics/top-endpoints` | verify all widgets use loader data only |
| `/anomalies` | Mixed | loader-backed list | `/anomalies` | detail drilldown also exists and should be checked in implementation pass |
| `/audit` | Mock | UI-only | `/audit-logs` | page exists with no loader yet |
| `/billing` | Mock/Mixed | UI-only demo billing shapes | `/billing/*` | backend exists but is estimate-based; UI needs careful mapping |
| `/developer` | Mock | UI-only | `/developer/*` | backend exists; frontend likely incomplete |
| `/integrations` | Mock | UI-only | `/integrations/*` | backend exists for CRUD/test flows |
| `/inventory` | Mock | UI-only | `/resources` | backend exists |
| `/mitigations` | Mock | UI-only | `/mitigations/*` | backend exists |
| `/notifications` | Mock/Mixed | likely store-driven UI | `/notifications` | backend exists |
| `/rules` | Mock | UI-only | `/rules` | backend exists |
| `/settings` | Mock | `lib/data/mock.ts` | `/auth/me`, `/settings`, possibly `/billing/budget` | backend coverage is partial; profile/password flows need exact mapping |
| `/team` | Mock | UI-only demo members | `/team/*` | backend exists |

## Auth / Onboarding

| Route | State | Current Data Source | Backend Source | Notes |
| --- | --- | --- | --- | --- |
| `/login` | Live | server action | `/auth/login` | keep current UX |
| `/register` | Live | server action | `/auth/register` | keep current UX |
| `/forgot-password` | Gap | server action exists | backend support needs confirmation | backend password-reset support should be checked before wiring further |
| `/reset-password` | Gap | server action exists | backend support needs confirmation | same as above |
| `/onboarding/connect` | Live | server action | `/cf-tokens`, `/cf-tokens/:id/verify` | verify exact field names against live contract |
| `/onboarding/zones` | Live/Mixed | server action | `/resources`, `/settings` or related onboarding write path | confirm selected-zone persistence path |
| `/onboarding/success` | Mock | static celebratory UI | backend not required unless invitation/send flow is added | may stay static unless product wants live invite send |

## Known Mock Sources

- `apps/web/src/lib/data/mock.ts`
- `apps/web/src/lib/components/layout/Sidebar.svelte`
- `apps/web/src/routes/(app)/settings/+page.svelte`

## First Integration Targets

1. Shared shell user/account data
2. Dashboard cleanup
3. Inventory
4. Rules
5. Integrations
6. Team
7. Billing

These have the best payoff because the backend already exposes matching resource types or route groups.
