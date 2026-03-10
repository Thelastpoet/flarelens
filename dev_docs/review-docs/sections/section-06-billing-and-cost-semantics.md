# Section 06 Review: Billing and Cost Semantics

## Scope

- `apps/api/src/services/analytics.ts`
- `apps/api/src/routes/analytics.ts`
- `apps/api/src/routes/billing.ts`
- `packages/db/src/repositories/billing-snapshots.ts`
- `packages/shared/src/constants.ts`
- `packages/shared/src/schemas/rules.ts`
- `apps/api/src/routes/mitigations.ts`
- `apps/api/src/crons/metrics-poll.ts`
- `apps/api/src/queues/anomaly-check.ts`

## Findings

### 1. High: The billing API surface is not backed by any ingestion path

- Files: `apps/api/src/routes/billing.ts`, `packages/db/src/repositories/billing-snapshots.ts`
- Details: The repository supports creating and updating `billing_snapshots`, but the application code only reads from that table and updates the budget field on an existing active snapshot. I did not find any cron, queue, or route that populates billing snapshots from Cloudflare or Stripe.
- Risk: `/billing/*` can return zeros, empty lists, or stale state while still presenting itself as a real billing subsystem.
- References:
  - `apps/api/src/routes/billing.ts:16`
  - `apps/api/src/routes/billing.ts:60`
  - `apps/api/src/routes/billing.ts:85`
  - `packages/db/src/repositories/billing-snapshots.ts:12`
  - `packages/db/src/repositories/billing-snapshots.ts:40`

### 2. High: Estimated cost and billing-style language are mixed without a clear contract

- Files: `apps/api/src/services/analytics.ts`, `apps/api/src/routes/analytics.ts`, `apps/api/src/routes/billing.ts`
- Details: `/analytics/overview` returns `estimatedCost`, `/analytics/cost` returns a calculated service-cost breakdown, and `/billing/overview` returns `current_spend` and `projected_monthly`. The API does not clearly separate heuristic estimates from authoritative billing data.
- Risk: Consumers can easily treat calculated analytics costs as actual billed spend, especially when the billing endpoints are empty and the analytics endpoints still return plausible numbers.
- References:
  - `apps/api/src/services/analytics.ts:255`
  - `apps/api/src/services/analytics.ts:361`
  - `apps/api/src/routes/analytics.ts:35`
  - `apps/api/src/routes/billing.ts:13`
  - `apps/api/src/routes/billing.ts:27`

### 3. Medium: The cost model is explicitly approximate but exposed as if it were durable business logic

- Files: `apps/api/src/services/analytics.ts`, `packages/shared/src/constants.ts`
- Details: Unit pricing is hardcoded as approximate constants, CDN cost is reduced to bandwidth, worker CPU is approximated from `cpuTimeP50 * requests`, and R2 storage cost is not included even though a storage unit constant exists.
- Risk: The numbers may be directionally useful, but they are not reliable enough to drive strong “budget guard” semantics unless the API labels them as estimates everywhere.
- References:
  - `packages/shared/src/constants.ts:151`
  - `apps/api/src/services/analytics.ts:255`
  - `apps/api/src/services/analytics.ts:422`
  - `apps/api/src/services/analytics.ts:438`
  - `apps/api/src/services/analytics.ts:451`
  - `apps/api/src/services/analytics.ts:464`

### 4. Medium: Cost- and budget-oriented rule surfaces exist, but the detection pipeline does not feed them

- Files: `packages/shared/src/schemas/rules.ts`, `apps/api/src/routes/mitigations.ts`, `apps/api/src/crons/metrics-poll.ts`, `apps/api/src/queues/anomaly-check.ts`
- Details: Rules allow `metric: 'cost'`, mitigations allow `trigger_type: 'cost_threshold'`, but the scheduled anomaly pipeline only enqueues request-count checks and builds recent values from `snapshot.requests`.
- Risk: The product can accept cost-oriented configuration that never fires in automatic detection, creating a false sense of protection.
- References:
  - `packages/shared/src/schemas/rules.ts:15`
  - `apps/api/src/routes/mitigations.ts:18`
  - `apps/api/src/crons/metrics-poll.ts:87`
  - `apps/api/src/queues/anomaly-check.ts:67`

## What Looks Acceptable

- The analytics service consistently treats missing Cloudflare context as a graceful empty-state rather than throwing.
- The cost estimation code is at least centralized, which makes later relabeling or replacement feasible.
- The billing routes are narrow and easy to revise once a real ingestion model exists.

## Verdict

The backend does not yet have production-grade billing semantics. Right now it exposes a mix of heuristic cost estimation and unpopulated billing endpoints, while also accepting cost-oriented rules and budgets that are not backed by authoritative or fully wired data.
