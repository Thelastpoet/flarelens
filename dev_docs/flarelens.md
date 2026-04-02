# FlareLens Product Scope

## Summary

FlareLens is a Cloudflare-focused monitoring product for catching abnormal usage before it becomes an operational or billing problem. The backend is built first around verified Cloudflare account access, zone telemetry, anomaly detection, attribution, and alert delivery.

The current product promise should be framed as:

- usage anomaly detection for Cloudflare-backed workloads
- contributor visibility for spikes
- estimated budget awareness
- optional, tightly controlled mitigation workflows

It should not be framed as authoritative Cloudflare billing control.

## Current Backend Scope

### Cloudflare onboarding

- Users connect Cloudflare through the account-owned Cloudflare API token flow.
- The web app opens Cloudflare's token creation page with FlareLens read scopes preselected for zones, analytics, Workers, KV, D1, and R2.
- Users must still set Cloudflare resource scope correctly:
  - `Zone Resources` -> `Include - All zones`
  - `Account Resources` -> `Include - All accounts` or the target account
- Users paste the generated token back into FlareLens and complete verification there.
- Tokens are stored as `pending` until verification succeeds.
- Verification resolves `cf_account_id` and probes usable capabilities instead of trusting token metadata alone.
- Minimum verified capabilities for analytics-backed monitoring are:
  - `zones:read`
  - `zones.analytics:read`

### Monitoring scope

The implemented detection pipeline currently centers on zone telemetry.

Supported monitored metrics:

- `requests`
- `cached_requests`
- `bytes`
- `threats`

Stored contributor data is limited and pragmatic:

- top countries are stored in snapshots
- endpoint, browser, and error views are queried live where available

Broader multi-product monitoring for Workers, R2, KV, and D1 remains partial and should not be advertised as fully implemented anomaly coverage.

### Detection and attribution

Detection currently combines:

- static thresholds
- baseline deviation
- short-window velocity checks

Attribution is best-effort and most useful for zone traffic anomalies. It is intended to explain spikes, not provide forensic certainty.

### Billing and budgets

Budget and cost outputs are estimated only.

- Analytics-derived usage is not the same as Cloudflare billing.
- Billing endpoints expose estimate semantics explicitly.
- Budget thresholds should be described as early-warning controls, not spend caps.

### Alerts

Supported notification channels in the backend:

- email
- Slack
- Discord
- PagerDuty
- Teams
- webhook
- in-app notifications

### Mitigations

Mitigation support exists, but it should be described carefully.

Supported backend actions:

- zone rate limiting
- Under Attack / security level changes
- pause worker

Constraints:

- manual execution defaults to dry-run
- live manual execution requires explicit confirmation
- automatic execution requires account opt-in
- unsupported actions such as user-agent blocking are not part of the supported surface

## MVP Boundaries

The MVP should be documented as:

- Cloudflare account connection
- token verification and capability checks
- resource sync
- zone telemetry monitoring
- anomaly detection
- attribution
- multi-channel alerting
- estimated budget monitoring

The MVP should not claim:

- authoritative billing ingestion
- broad multi-service anomaly coverage across every Cloudflare product
- unrestricted automated mitigation
- user-agent blocking or other undocumented mitigation shortcuts

## Technology Direction

The actual implementation is Cloudflare-native, not a generic Node/Postgres/Redis stack.

- Frontend: SvelteKit on Cloudflare Workers
- API: Hono on Cloudflare Workers
- Primary database: D1
- Session/cache/dedup: Workers KV
- Async processing: Cloudflare Queues
- Live updates: Durable Objects
- Email: Resend

The committed backend runtime does not currently use Analytics Engine or R2 for core API behavior.

## Security Expectations

- Use scoped API tokens only
- Encrypt stored third-party secrets and Cloudflare tokens
- Treat developer tokens as managed inventory, not supported bearer API auth
- Require verified account context before account-scoped Cloudflare operations
- Keep mitigation execution auditable and opt-in

## Near-Term Product Notes

- Expand docs and UI around verified-token failure reasons
- Be explicit everywhere that billing is estimated
- Keep detection language aligned with implemented zone telemetry
- Treat mitigation automation as controlled safety tooling, not autonomous protection
