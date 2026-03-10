# Frontend Integration Audit

## Purpose

This directory tracks the frontend integration work for `apps/web`.

The goal is not to redesign the product. The goal is to keep the existing UI exactly as intended, remove mock-backed behavior, and wire each screen to the real backend wherever the API already supports it.

This track also includes frontend quality fixes that should happen in parallel with the wiring pass: accessibility, fake-interaction cleanup, and other implementation issues that weaken the shipped UI without changing its design.

## Working Rules

- Preserve the current visual design and information architecture.
- Replace mock data with backend data without flattening or simplifying the UI.
- If the backend already supports a UI feature but the frontend does not surface it, extend the frontend.
- If the UI expects data the backend does not provide yet, record the gap instead of inventing frontend-only behavior.
- Keep this audit separate from backend remediation docs.

## Documents

- `frontend-integration-plan.md`
  - execution approach and sequencing
- `frontend-screen-api-matrix.md`
  - route-by-route mapping of current UI, data source, and backend readiness
- `frontend-integration-tasks.md`
  - execution source of truth for the wiring pass
- `frontend-quality-audit.md`
  - first-pass implementation and accessibility findings

## Current Starting Point

- `apps/web/src/lib/data/mock.ts` still contains large demo datasets.
- `Sidebar.svelte` and `settings/+page.svelte` directly import mock user/account data.
- Only a small subset of app routes currently have page loaders:
  - dashboard
  - analytics
  - anomalies
  - anomaly detail
  - onboarding connect
  - onboarding zones
- Most app pages are still UI-only and need a route-by-route integration pass.

## Outcome Target

When this audit is complete, each frontend surface should be classified as:

- backend-backed
- backend-backed with frontend extension needed
- blocked by backend gap
