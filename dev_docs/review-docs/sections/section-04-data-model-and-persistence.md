# Section 04 Review: Data Model and Persistence

## Scope

- `packages/db/migrations/0001_init.sql`
- `packages/db/src/repositories/resources.ts`
- `packages/db/src/repositories/zone-snapshots.ts`
- `packages/db/src/repositories/billing-snapshots.ts`
- `apps/api/src/crons/metrics-poll.ts`
- `apps/api/src/crons/housekeeping.ts`
- `apps/api/src/routes/billing.ts`

## Findings

### 1. High: Resource identity is keyed too broadly and can collide across Cloudflare product types

- Files: `packages/db/migrations/0001_init.sql`, `packages/db/src/repositories/resources.ts`
- Details: The `resources` table enforces uniqueness on `(account_id, cf_resource_id)` only, and `upsertFromCF()` also conflicts on that pair only. The model does not include `type` in the uniqueness boundary.
- Risk: Two different Cloudflare resource types with the same identifier string inside one account can overwrite each other or be treated as the same monitored resource.
- References:
  - `packages/db/migrations/0001_init.sql:77`
  - `packages/db/migrations/0001_init.sql:91`
  - `packages/db/src/repositories/resources.ts:27`
  - `packages/db/src/repositories/resources.ts:102`
  - `packages/db/src/repositories/resources.ts:105`

### 2. High: Zone snapshot “upsert” is not idempotent because there is no natural-key conflict target

- Files: `packages/db/migrations/0001_init.sql`, `packages/db/src/repositories/zone-snapshots.ts`, `apps/api/src/crons/metrics-poll.ts`
- Details: `zone_snapshots.upsert()` uses `ON CONFLICT DO NOTHING`, but the table has no unique constraint on `(account_id, resource_id, timestamp)` or equivalent. The polling job always generates a fresh random primary key before inserting.
- Risk: Retries or repeated polls for the same window will create duplicate snapshots instead of deduplicating or updating a known timeseries point.
- References:
  - `packages/db/migrations/0001_init.sql:96`
  - `packages/db/migrations/0001_init.sql:113`
  - `packages/db/src/repositories/zone-snapshots.ts:20`
  - `packages/db/src/repositories/zone-snapshots.ts:26`
  - `apps/api/src/crons/metrics-poll.ts:64`
  - `apps/api/src/crons/metrics-poll.ts:65`

### 3. Medium: Snapshot retention logic is inconsistent about whether age is based on event time or insert time

- Files: `packages/db/src/repositories/zone-snapshots.ts`, `apps/api/src/crons/housekeeping.ts`
- Details: The repository cleanup method deletes by `timestamp`, but the scheduled housekeeping job deletes by `created_at`.
- Risk: Backfilled or retried inserts can remain longer than intended, and retention semantics become dependent on when rows were written rather than when the traffic actually occurred.
- References:
  - `packages/db/src/repositories/zone-snapshots.ts:62`
  - `packages/db/src/repositories/zone-snapshots.ts:65`
  - `apps/api/src/crons/housekeeping.ts:17`
  - `apps/api/src/crons/housekeeping.ts:18`

### 4. Medium: Budget persistence is tied to the existence of an active billing snapshot

- Files: `packages/db/src/repositories/billing-snapshots.ts`, `apps/api/src/routes/billing.ts`
- Details: `setBudget()` only updates the current active snapshot. If no active billing snapshot exists, the route still returns success and the budget is not stored anywhere.
- Risk: Budget configuration can be silently dropped, leaving the API state inconsistent with what the user was told.
- References:
  - `packages/db/src/repositories/billing-snapshots.ts:75`
  - `packages/db/src/repositories/billing-snapshots.ts:80`
  - `apps/api/src/routes/billing.ts:76`
  - `apps/api/src/routes/billing.ts:85`

## What Looks Acceptable

- Most repositories consistently scope reads and writes by `account_id`.
- The shared types intentionally mirror raw D1 row shapes, including JSON-text columns, which is internally consistent even if higher layers must parse those fields explicitly.
- The schema covers the core entities the backend currently uses; the larger problems are uniqueness, lifecycle semantics, and idempotency rather than missing tables.

## Verdict

The persistence layer is structurally close, but several data-lifecycle assumptions are unsafe for production. The biggest issues are resource identity collisions, non-idempotent snapshot ingestion, inconsistent retention rules, and budget state being stored only when billing data already exists.
