# Backend Deployed Validation Evidence

## Purpose

This note records live production validation results for the deployed API after backend remediation completion.

## Environment

- API URL: `__YOUR_API_URL__`
- Cloudflare account: `__CLOUDFLARE_ACCOUNT_ID__`
- Validation mode: controlled live checks against the deployed Worker and production D1

## Test Rules

- Use disposable FlareLens accounts for live validation.
- Use scoped Cloudflare credentials only.
- Do not leave live Cloudflare tokens or synced inventory behind after a test run.
- Prefer non-critical resources for any mitigation or anomaly test.
- Record request outcomes and cleanup state for every completed live task.

## Cleanup Policy

- Delete synced `resources` rows for the disposable FlareLens account after validation.
- Delete stored `cf_tokens` rows for the disposable FlareLens account after validation.
- Avoid retaining third-party integration secrets unless the task explicitly requires persistent test configuration.

## Proven Checks

### Core API Reachability

- `GET /health`
- Result: passed
- Evidence: deployed API returned `{"status":"ok", ... }`

### Auth Flow

- `POST /auth/register`
- `GET /auth/me`
- `POST /auth/logout`
- `POST /auth/login`
- Result: passed

### Token Storage

- `POST /cf-tokens`
- Result: passed after fixing production D1 migration drift and the malformed `TOKEN_ENCRYPTION_KEY`

### Token Verification Failure Handling

- `POST /cf-tokens/:id/verify` with an invalid token
- Result: passed
- Expected behavior confirmed: `400 VALIDATION_ERROR`, not `500`

### Token Verification Happy Path

- `POST /cf-tokens`
- `POST /cf-tokens/:id/verify`
- Result: passed with a real scoped Cloudflare API token
- Verified capabilities observed:
  - `zones:read`
  - `zones.analytics:read`
  - `workers:read`
  - `r2:read`
  - `kv:read`
  - `d1:read`

### Resource Sync

- `POST /resources/sync`
- Result: passed
- Live result observed: `{"synced":53}`

### Resource Inventory Read

- `GET /resources`
- Result: passed
- Live result observed: zones, Workers, KV namespaces, D1 databases, and other account resources were returned after sync

### Analytics Read Path

- `GET /analytics/overview`
- `GET /analytics/traffic`
- `GET /analytics/geo`
- `GET /analytics/cost`
- Result: passed
- Notes:
  - analytics requires a verified token and synced resources for the disposable FlareLens account
  - `overview` responses are cached for 60 seconds, so pre-sync checks can temporarily return zeroed results for a fresh account

## Example Live Results

- `overview`
  - `totalRequests: 44274`
  - `cachedRequests: 10157`
  - `totalBytes: 741376145`
  - `estimatedCost: 0.005576852550899237`
  - `threatsBlocked: 72`
  - `workerExecutions: 1328`
- `traffic`
  - hourly request and byte series returned successfully
- `geo`
  - live country distribution returned successfully
- `cost`
  - estimate-based response returned successfully

## Production Fixes Confirmed During Validation

- Live D1 schema was patched to include the missing `cf_tokens` verification columns and persistence indexes.
- Live `d1_migrations` metadata was backfilled so migration tracking is consistent.
- Production `TOKEN_ENCRYPTION_KEY` was rotated to a valid 64-character hex key.

## Current Status

- `V001`: passed
- `V002`: passed

## Integration Validation

### Webhook Success Path

- Task: `V003`
- Result: passed
- Validation steps:
  - created a webhook integration on a disposable free-plan FlareLens account
  - ran `POST /integrations/webhook/test?id=...`
  - captured the outbound request at `webhook.site`
- Observed:
  - HTTP `200 {"success":true}` from the test endpoint
  - received `event: "test"` payload at the controlled endpoint
  - `X-FlareLens-Signature` header was present
  - custom test header was preserved
  - `User-Agent: FlareLens-Webhook/1.0` was present

### Webhook Failure Path

- Task: `V005`
- Result: passed
- Validation steps:
  - created a webhook integration targeting `https://httpbin.org/status/500`
  - ran `POST /integrations/webhook/test?id=...`
- Observed:
  - HTTP `400 VALIDATION_ERROR`
  - message: `Test failed: Webhook returned 500`
  - failed test execution is now audit-logged with `entity_type: "integration"` and `metadata.outcome: "failed"`

### Integration Plan Limits

- Task: `V006`
- Result: passed after fix
- Validation steps:
  - used a disposable `free` plan FlareLens account
  - created one webhook integration successfully
  - attempted to create a second webhook integration
- Observed:
  - first webhook creation returned HTTP `201`
  - second webhook creation returned HTTP `400`
  - error: `Plan limit reached: max 1 integration`
- Conclusion:
  - live plan-limit enforcement is now active on the webhook route and uses the same plan gate as the other integration families

### Chat / Incident Integrations

- Task: `V004`
- Result: blocked
- Reason:
  - no live Slack, Discord, PagerDuty, or Teams test credentials were available for this validation window

## Anomaly and Queue Validation

### Controlled Anomaly Setup

- Tasks: `V007`, `V008`, `V009`
- Result: passed after fix
- Validation steps:
  - created a disposable account with a verified token and synced zone resources
  - created a zone-scoped threshold rule with `metric=requests`, `operator=gte`, `threshold=1`, `window=5m`
  - observed the next `*/5 * * * *` cron in Worker tail
- Observed:
  - cron fired on schedule
  - `metrics-poll` pushed live updates and enqueued `flarelens-anomaly-check` queue messages without the old GraphQL access failures
  - a real anomaly row was created for the disposable account and threshold rule
  - Worker tail showed a downstream `flarelens-alert-dispatch` queue message after anomaly creation
- Conclusion:
  - scheduled polling, queue fan-out, anomaly creation, and alert-dispatch attempt now work end to end in production

## Mitigation Validation

### Dry-Run Mitigation

- Tasks: `V010`, `V012`
- Result: passed for dry-run coverage
- Validation steps:
  - created a rate-limit mitigation on a synced zone
  - manually triggered it with `{"dry_run": true, "confirm": false}`
- Observed:
  - HTTP `200`
  - response showed `dry_run: true`, `executed: false`
  - provider action: `zone_rate_limit`
  - request metadata was returned as expected
  - mitigation trigger was written to audit logs with `action: "system"`

### Confirmed Live Mitigation

- Task: `V011`
- Result: blocked
- Reason:
  - no explicitly safe non-critical resource was designated for a real live mitigation action
  - a confirmed action would have modified a real production Cloudflare resource

## Cron Observation

### Polling Cron

- Task: `V013`
- Result: passed
- Observed:
  - `*/5 * * * *` cron triggered in production Worker logs on the deployed Worker
  - the cron produced `POST https://internal/push` activity, anomaly-check queue batches, and a live anomaly for the disposable account after rule setup

### Cron Error Health

- Task: `V015`
- Result: passed for the polling path
- Observed:
  - the earlier repeating `metrics-poll` GraphQL access errors were no longer observed after the adaptive-query poller change
  - Worker tail showed the expected cron and queue activity instead

### Longer-Window Cron Coverage

- Task: `V014`
- Result: not completed
- Reason:
  - baseline, digest, and housekeeping jobs require a longer dedicated observation window than this validation pass covered

## Not Yet Validated

- live chat or incident integration delivery with real external credentials
- confirmed live mitigation execution on an explicitly safe resource
- longer-window cron behavior for baseline, digest, and housekeeping schedules
