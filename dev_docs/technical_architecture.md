# FlareLens Backend Technical Architecture

This document describes the current backend architecture after the API remediation work. It is intentionally a current-state reference, not a target-state wishlist.

## 1. Runtime Stack

- Web app: SvelteKit on Cloudflare Workers
- API: Hono Worker in `apps/api`
- Database: D1
- Session/cache/dedup: Workers KV
- Async processing: Cloudflare Queues
- Live account feeds: Durable Objects
- Email delivery: Resend

Not in the committed backend runtime:

- Analytics Engine
- R2-backed report/export flows
- bearer developer-token API auth

## 2. High-Level Flow

1. A user authenticates with cookie-based sessions.
2. An admin creates an account-owned Cloudflare API token from the FlareLens-guided Cloudflare template flow, then pastes it into FlareLens.
3. The token remains `pending` until verification:
   - Cloudflare account resolution
   - account-owned token validity check
   - capability probes for required account/analytics access
4. Verified tokens are used for resource sync, analytics queries, and mitigation execution.
5. Cron jobs poll zone telemetry, persist snapshots, and enqueue anomaly checks.
6. Detection creates anomalies, emits alerts, and may run mitigations only when account opt-in is enabled.

## 3. Authentication and Tenant Model

- Session auth is the supported runtime auth mode.
- Sessions are stored in KV and issued as opaque cookies.
- Localhost cookie handling is explicitly supported for local HTTP development.
- Account context is derived from active team membership.
- Developer tokens are admin-managed records only; the backend does not currently mount bearer-token auth middleware.

## 4. Cloudflare Token Verification

Implemented behavior:

- token storage is encrypted with `TOKEN_ENCRYPTION_KEY`
- the web app drives Cloudflare's account-owned token creation screen with FlareLens scopes preselected
- verification resolves `cf_account_id`
- token validity is checked with Cloudflare's account-owned token verification endpoint
- capabilities are derived from follow-up API probes instead of trusting token template metadata alone

Required verified capabilities for analytics-backed monitoring:

- `zones:read`
- `zones.analytics:read`

Verification failures are persisted and audit logged so onboarding is diagnosable.

## 5. Supported Monitoring Scope

The backend detection pipeline is currently centered on zone telemetry.

Primary supported metrics:

- `requests`
- `cached_requests`
- `bytes`
- `threats`

What is persisted:

- zone snapshots
- top countries
- baselines for supported metrics
- anomalies, notifications, mitigations, and audit logs

What remains partial or live-query-driven:

- endpoint breakdowns
- browser/client distributions
- error breakdowns
- worker performance context used by some analytics views

Cost and billing outputs are estimates derived from analytics, not imported billing truth.

## 6. Cron and Queue Design

Committed cron schedule:

- every 5 minutes: metrics poll
- every 6 hours: baseline recalculation
- daily at 08:00 UTC: digest job
- every 12 hours: resource sync
- daily at 03:00 UTC: housekeeping

Committed queue consumers:

- anomaly-check queue
- alert-dispatch queue

The 5-minute polling path now uses minute-granularity GraphQL traffic buckets so the schedule matches the selected dataset.

## 7. Alerting and Mitigation

Alerting channels:

- email
- Slack
- Discord
- PagerDuty
- Teams
- webhook
- in-app notifications

Mitigation support:

- rate limit
- under attack / security level changes
- pause worker

Mitigation safety rules:

- manual trigger defaults to dry-run
- live manual trigger requires explicit confirmation
- automatic mitigation requires account opt-in
- unsupported actions such as UA blocking are not part of the supported contract

## 8. API Surface Notes

Mounted route groups in `apps/api/src/index.tsx`:

- `/auth`
- `/cf-tokens`
- `/resources`
- `/analytics`
- `/anomalies`
- `/notifications`
- `/rules`
- `/team`
- `/integrations`
- `/billing`
- `/audit-logs`
- `/developer`
- `/mitigations`
- `/settings`
- `/ws`

Important contract notes:

- the API is mounted at the worker root; the web app proxies `/api/*` to it
- there is no committed `/v1` namespace
- analytics routes require a verified Cloudflare token with analytics capabilities
- billing routes are estimate-oriented

## 9. Persistence Model

Core D1 entities include:

- users
- accounts
- team_members
- cf_tokens
- resources
- zone_snapshots
- baselines
- rules
- anomalies
- notifications
- alert_deliveries
- mitigations
- integrations
- audit_logs

Recent persistence hardening includes:

- type-aware resource identity
- natural-key zone snapshot upserts
- narrower alert dedup semantics
- OAuth subject persistence
- invite flow corrections

## 10. Known Constraints

- KV rate limiting is best-effort, not a strict distributed limiter
- billing data is estimated, not authoritative Cloudflare invoicing
- multi-service anomaly coverage is not yet broad product-wide monitoring
- body validation remains custom middleware; query validation is improved but not fully framework-standardized

## 11. Contributor References

Review and execution material lives in:

- `dev_docs/review-docs/README.md`
- `dev_docs/review-docs/plans/api-review-remediation-plan.md`
- `dev_docs/review-docs/plans/api-review-traceability-matrix.md`
- `dev_docs/api-review-remediation-tasks.md`

Use those documents for open findings, task coverage, and execution order.
