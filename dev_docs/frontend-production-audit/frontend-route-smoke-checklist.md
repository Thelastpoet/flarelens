# Frontend Route Smoke Checklist

## Purpose

Use this checklist before any production web deploy that changes route loading, server adapters, onboarding, or authenticated navigation.

## Preconditions

- Deploy the current `apps/web` build to the live Workers environment.
- Use a real authenticated account with a verified Cloudflare connection.
- Keep browser console and network panel open during the pass.

## Authenticated Route Pass

- `/dashboard`
  - page renders without blanking after hydration
  - either live dashboard data appears or the explicit unavailable state appears
- `/analytics`
  - page renders without blanking after hydration
  - either live analytics data appears or the explicit unavailable state appears
- `/settings`
  - profile, account, and notification sections render without full-page failure
- `/inventory`
  - resources render without SSR failure
  - sync, pause, resume, and remove controls remain interactive
- `/rules`
  - rules list renders
  - create/edit/delete modal flow opens without console errors
- `/mitigations`
  - mitigation list renders
  - create/edit modal opens without contract errors
- `/integrations`
  - integrations page renders without dead UI state
- `/team`
  - members render
  - invite modal opens without console errors
- `/notifications`
  - notifications render and bulk actions still work
- `/billing`
  - billing estimates render without blanking
- `/audit`
  - audit entries render and filters stay functional
- `/developer`
  - developer token inventory renders
- `/anomalies`
  - anomaly list renders
- `/anomalies/:id`
  - detail page renders without JSON parsing errors

## Onboarding Pass

- `/onboarding/connect`
  - renders outside the dashboard shell
  - submit button shows `connecting` state
- `/onboarding/zones`
  - renders immediately
  - sync does not block first render
  - explicit `syncing`, `ready`, `no-resources`, and `retry` states behave correctly
- `/onboarding/success`
  - renders outside the dashboard shell
  - success counts come from server data, not client fallback values

## Failure Conditions

Stop the release if any of the following occur:

- full-page `500` on an authenticated route
- page renders, then blanks after hydration
- browser console shows contract errors (`toFixed`, `.find`, `JSON.parse`, undefined field access)
- onboarding renders inside the app shell again
- route shows stale mock content instead of backend-backed state

## Release Gate

Do not deploy the frontend unless this checklist, `pnpm --filter web check`, and `pnpm --filter web build` all pass.
