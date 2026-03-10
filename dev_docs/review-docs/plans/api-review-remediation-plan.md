# API Review Remediation Plan

## Purpose

This document captures the highest-priority fixes identified during API/backend review and the product-doc gap analysis. It is intended as a short execution plan for follow-up implementation work.

## P0: Onboarding, Auth, and Cloudflare Identity

### 1. Fix Cloudflare account discovery during token onboarding

- Update token verification flow to resolve and persist the correct `cf_account_id`.
- Do not mark tokens as verified unless the account context is known.
- Add explicit failure states for:
  - token is valid but account cannot be determined
  - token is valid but required account/zone APIs are inaccessible

### 2. Replace invalid scope verification assumptions

- Remove reliance on `verifyResult.policies` from `/user/tokens/verify`.
- Validate capability by performing targeted follow-up calls needed for the product:
  - zone listing
  - account-scoped resource listing
  - GraphQL analytics query
- Persist a derived capability model in the database instead of assumed permission strings.

### 3. Fix local development session cookies

- Pass request host into session creation so localhost cookies are not always `Secure`.
- Verify login/register/logout locally over HTTP.

## P1: Mitigation Correctness and Safety

### 4. Replace unsupported mitigation implementations

- Remove or disable the current IP Access Rule based user-agent blocking path.
- Rework rate limiting to use a valid Cloudflare API shape and a real mitigation mode instead of `simulate`.
- Reassess whether “pause worker” and “under attack mode” are safe defaults for automatic execution.

### 5. Gate Guardian automation behind explicit safety controls

- Add a global account-level opt-in before any automatic mitigation runs.
- Require dry-run/test mode for newly created mitigations.
- Record exact Cloudflare API request/response metadata in audit logs.

## P1: Billing and Cost Model

### 6. Reframe billing as estimation until backed by ingestion

- Mark all current cost/budget outputs as estimated.
- Either implement billing snapshot population or hide budget endpoints until data exists.
- Document that GraphQL analytics is not authoritative billing data.

## P1: Detection Pipeline Depth

### 7. Align implemented detection with product claims

- Expand polling beyond request count if multi-service monitoring remains in scope.
- Persist real top contributors in snapshots where feasible.
- Add baselines for additional metrics or narrow the product promise to request-spike detection first.

## P2: Documentation and Scope Correction

### 8. Update `dev_docs/flarelens.md`

- Replace outdated stack assumptions with the actual Cloudflare-native architecture.
- Clarify MVP versus future scope, especially around Guardian Mode.
- Add operational assumptions:
  - account ID discovery
  - capability verification
  - estimated billing only
  - mitigation limitations and safety constraints

## Suggested Execution Order

1. Token onboarding and account discovery
2. Local auth/session fixes
3. Disable incorrect mitigations
4. Rebuild mitigation flows safely
5. Implement or hide billing snapshot features
6. Narrow or deepen detection scope
7. Rewrite product and architecture docs

## Verification Commands

- API compile gate: `cd apps/api && pnpm exec tsc --noEmit`
- Shared types compile gate: `cd packages/shared && pnpm exec tsc --noEmit`
- DB compile gate: `cd packages/db && pnpm exec tsc --noEmit`
- API phase tests: `cd apps/api && pnpm exec vitest run --config vitest.config.ts`
