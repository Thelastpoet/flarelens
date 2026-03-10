# Section 05 Review: Detection, Queues, and Cron Jobs

## Scope

- `apps/api/src/services/detection/*.ts`
- `apps/api/src/services/alerts/*.ts`
- `apps/api/src/queues/*.ts`
- `apps/api/src/crons/*.ts`
- `apps/api/src/index.tsx`
- `packages/db/src/repositories/anomalies.ts`
- `packages/db/migrations/0001_init.sql`

## Findings

### 1. High: Alert deduplication is keyed too broadly and can suppress distinct incidents

- Files: `apps/api/src/services/alerts/dedup.ts`, `apps/api/src/services/alerts/dispatcher.ts`
- Details: The dedup key only uses `account_id`, `rule_id` or a fallback `'baseline'`, and `resource_id`. It does not include the metric, severity, or detection type.
- Risk: Different anomalies on the same resource can suppress each other. This is especially bad for baseline and velocity alerts, which both collapse into the same `'baseline'` key when `rule_id` is null.
- References:
  - `apps/api/src/services/alerts/dedup.ts:4`
  - `apps/api/src/services/alerts/dedup.ts:9`
  - `apps/api/src/services/alerts/dispatcher.ts:17`
  - `apps/api/src/services/alerts/dispatcher.ts:134`

### 2. High: Queue processing is not idempotent enough to prevent duplicate anomalies or duplicate alert fan-out

- Files: `apps/api/src/services/detection/index.ts`, `apps/api/src/queues/anomaly-check.ts`, `apps/api/src/queues/alert-dispatch.ts`, `packages/db/src/repositories/anomalies.ts`, `packages/db/migrations/0001_init.sql`
- Details: Detection deduplicates by querying recent anomalies before insert, but anomaly creation is a separate write with no database uniqueness guard. Alert dispatch only marks the dedup key after notifications are sent, so a retry or crash after partial fan-out can resend channels.
- Risk: Retries and concurrent deliveries can create duplicate anomaly rows and duplicate notifications.
- References:
  - `apps/api/src/services/detection/index.ts:95`
  - `apps/api/src/services/detection/index.ts:145`
  - `apps/api/src/queues/anomaly-check.ts:69`
  - `apps/api/src/queues/alert-dispatch.ts:60`
  - `packages/db/src/repositories/anomalies.ts:63`
  - `packages/db/migrations/0001_init.sql:162`
  - `packages/db/migrations/0001_init.sql:180`

### 3. Medium: The polling cron stores placeholder values as if they were measured analytics

- Files: `apps/api/src/crons/metrics-poll.ts`
- Details: Every stored snapshot hardcodes `threats`, `page_views`, and `unique_visitors` to `0`, and persists empty arrays for `top_endpoints`, `top_countries`, and `top_user_agents`.
- Risk: Downstream consumers cannot distinguish “not collected” from genuine zero activity, which makes stored snapshots misleading.
- References:
  - `apps/api/src/crons/metrics-poll.ts:69`
  - `apps/api/src/crons/metrics-poll.ts:72`
  - `apps/api/src/crons/metrics-poll.ts:76`

### 4. Medium: The end-to-end detection pipeline currently covers only request-count anomalies

- Files: `apps/api/src/crons/metrics-poll.ts`, `apps/api/src/queues/anomaly-check.ts`, `apps/api/src/crons/baseline-recalc.ts`
- Details: The poller always enqueues `metric: 'requests'`, the anomaly queue builds recent values from `snapshot.requests`, and baseline recalculation only computes `requests` baselines.
- Risk: The backend architecture suggests multi-metric anomaly detection, but the implemented pipeline only supports one metric end to end.
- References:
  - `apps/api/src/crons/metrics-poll.ts:81`
  - `apps/api/src/crons/metrics-poll.ts:87`
  - `apps/api/src/queues/anomaly-check.ts:61`
  - `apps/api/src/queues/anomaly-check.ts:67`
  - `apps/api/src/crons/baseline-recalc.ts:40`
  - `apps/api/src/crons/baseline-recalc.ts:56`

## What Looks Acceptable

- The overall flow from poller to anomaly queue to alert queue is coherent in structure.
- Per-account cron iteration is isolated, so one account failing does not stop the whole scheduled run.
- Attribution and external alert fan-out are treated as best-effort rather than hard blockers, which is a reasonable operational default.

## Verdict

The detection pipeline is architecturally recognizable, but it is not production-safe yet. The main issues are overly broad alert deduplication, weak idempotency under queue retries, placeholder analytics being stored as truth, and a much narrower detection surface than the product language implies.
