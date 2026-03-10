# Route Failure Matrix

## Scope

This matrix classifies the current `apps/web` app routes by how they load data and how they fail under real backend data.

## Failure Classes

- `SSR-500`
  - route fails before render
- `Hydration-Crash`
  - initial HTML renders, then page blanks during client hydration
- `Blocking-Load`
  - route performs too much work before first useful render
- `Contract-Risk`
  - route may render now, but data assumptions are too weak for production confidence

## Shared App Shell

### `(app)/+layout.ts`

- Current role:
  - loads authenticated user context and unread notification count
- Current status:
  - mostly functional
- Risk:
  - shell correctness depends on every child route not crashing during hydration

## High-Risk Routes

### `/dashboard`

- Loader:
  - `+page.ts`
- Backend calls:
  - `/analytics/overview`
  - `/analytics/traffic`
  - `/analytics/baseline`
  - `/analytics/top-endpoints`
  - `/analytics/bot-activity`
- Failure class:
  - `Hydration-Crash`
  - `Contract-Risk`
- Why:
  - page assumes live analytics shapes are already normalized
  - historical `.find` crash confirms unstable route contract

### `/analytics`

- Loader:
  - `+page.ts`
- Backend calls:
  - `/analytics/traffic`
  - `/analytics/geo`
  - `/analytics/clients`
  - `/analytics/top-endpoints`
  - `/analytics/performance`
  - `/analytics/errors`
- Failure class:
  - `Hydration-Crash`
  - `Contract-Risk`
- Why:
  - page/components assume numeric and percentage fields exist
  - historical `.toFixed` crash confirms the route is not render-safe under real payload variance

### `/settings`

- Loader:
  - `+page.ts`
- Backend calls:
  - `/settings/profile`
  - `/settings/notifications`
  - `/settings/account`
- Failure class:
  - `SSR-500`
- Why:
  - route loading architecture is still unsafe in production SSR
  - loader path needs server-only normalization and consistent transport behavior

### `/inventory`

- Loader:
  - `+page.ts`
- Backend calls:
  - `/resources`
  - `/rules`
- Failure class:
  - `SSR-500`
- Why:
  - same route-loading class as settings
  - server load path is not consistently isolated from transport/runtime behavior

## Medium-Risk Routes

### `/billing`

- Loader:
  - `+page.ts`
- Failure class:
  - `Contract-Risk`
- Why:
  - cost/budget views depend on partial estimated data and require a normalized view model

### `/rules`

- Loader:
  - `+page.ts`
- Failure class:
  - `Contract-Risk`
- Why:
  - page derives resource references and can fail if relationships or arrays are not stable

### `/integrations`

- Loader:
  - `+page.ts`
- Failure class:
  - `Contract-Risk`
- Why:
  - UI mixes delivery/test states with live backend inventory and should be normalized before render

### `/mitigations`

- Loader:
  - `+page.ts`
- Failure class:
  - `Contract-Risk`
- Why:
  - page derives names and estimated values from backend objects and currently carries too much interpretation in the UI layer

### `/team`

- Loader:
  - `+page.ts`
- Failure class:
  - `Contract-Risk`

### `/developer`

- Loader:
  - `+page.ts`
- Failure class:
  - `Contract-Risk`

### `/notifications`

- Loader:
  - `+page.ts`
- Failure class:
  - `Contract-Risk`

### `/audit`

- Loader:
  - `+page.ts`
- Failure class:
  - `Contract-Risk`

### `/anomalies`

- Loader:
  - `+page.ts`
- Failure class:
  - `Contract-Risk`

### `/anomalies/[id]`

- Loader:
  - `+page.ts`
- Failure class:
  - `Contract-Risk`

## Onboarding Routes

### `/onboarding/connect`

- Loader/action:
  - `+page.server.ts`
- Failure class:
  - `Contract-Risk`
- Why:
  - connect flow itself can succeed while the next step still fails

### `/onboarding/zones`

- Loader/action:
  - `+page.server.ts`
- Failure class:
  - `Blocking-Load`
  - `Contract-Risk`
- Why:
  - route currently combines onboarding rendering with resource synchronization concerns

### `/onboarding/success`

- Loader:
  - `+page.ts`
- Failure class:
  - `Contract-Risk`

## Main Conclusion

The route map shows a pattern:

- analytics-heavy pages suffer from hydration contract failures
- management pages suffer from route-loading architecture failures
- onboarding suffers from blocking work and shell/layout concerns

This is why the problem feels app-wide instead of page-specific.
