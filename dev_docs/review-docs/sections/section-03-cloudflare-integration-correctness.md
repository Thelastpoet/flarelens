# Section 03 Review: Cloudflare Integration Correctness

## Scope

- `apps/api/src/services/cloudflare/client.ts`
- `apps/api/src/services/cloudflare/graphql.ts`
- `apps/api/src/services/mitigation/executor.ts`
- `apps/api/src/routes/cf-tokens.ts`
- `apps/api/src/routes/resources.ts`
- `apps/api/src/crons/metrics-poll.ts`

## Findings

### 1. High: Cloudflare account discovery is not actually implemented

- Files: `apps/api/src/routes/cf-tokens.ts`, `apps/api/src/routes/resources.ts`, `apps/api/src/crons/metrics-poll.ts`
- Details: Token verification never resolves and stores `cf_account_id`. Resource sync skips tokens with no account ID, while the metrics poll falls back to the FlareLens internal `account_id` if `cf_account_id` is missing.
- Risk: A token can be “verified” but still unusable for account-scoped Cloudflare operations.
- References:
  - `apps/api/src/routes/cf-tokens.ts:55`
  - `apps/api/src/routes/cf-tokens.ts:87`
  - `apps/api/src/routes/resources.ts:102`
  - `apps/api/src/crons/metrics-poll.ts:42`

### 2. High: User-agent blocking is implemented against the wrong Cloudflare API

- Files: `apps/api/src/services/cloudflare/client.ts`, `apps/api/src/services/mitigation/executor.ts`
- Details: The backend attempts to block user agents through IP Access Rules with `target: 'user_agent'`. Cloudflare documents IP Access Rules for IPs, ranges, ASNs, and countries, while user-agent blocking is a different feature/API surface.
- Risk: The mitigation will not work as implemented and creates false confidence that malicious user agents can be blocked automatically.
- References:
  - `apps/api/src/services/cloudflare/client.ts:152`
  - `apps/api/src/services/mitigation/executor.ts:41`
- Official references:
  - https://developers.cloudflare.com/waf/tools/ip-access-rules/parameters/
  - https://developers.cloudflare.com/api/resources/firewall/subresources/ua_rules/
  - https://developers.cloudflare.com/waf/tools/user-agent-blocking/

### 3. High: Rate-limiting mitigation uses a deprecated API shape and does not perform a real mitigation

- Files: `apps/api/src/services/cloudflare/client.ts`, `apps/api/src/services/mitigation/executor.ts`
- Details: The backend posts to `/zones/{zone_id}/rate_limits` with an invalid `match.request.url` shape and sets `action.mode` to `simulate`. Cloudflare now documents rate limiting through the Ruleset Engine and marks the previous zone rate-limits API as deprecated.
- Risk: Even if the request shape were accepted, the configured action would not actually protect the zone.
- References:
  - `apps/api/src/services/cloudflare/client.ts:137`
  - `apps/api/src/services/mitigation/executor.ts:32`
- Official references:
  - https://developers.cloudflare.com/api/resources/rate_limits/methods/create/
  - https://developers.cloudflare.com/waf/rate-limiting-rules/create-api/

### 4. Medium: “Verified permissions” are derived from assumptions not backed by the current token-verify response

- Files: `apps/api/src/services/cloudflare/client.ts`, `apps/api/src/routes/cf-tokens.ts`
- Details: The client type and route logic expect `policies` on `/user/tokens/verify`, but the current official token-verify response is documented around token identity and status, not full operational capability metadata.
- Risk: The backend overstates what verification proves and may mislabel tokens as operationally safe.
- References:
  - `apps/api/src/services/cloudflare/client.ts:34`
  - `apps/api/src/routes/cf-tokens.ts:82`
- Official reference:
  - https://developers.cloudflare.com/api/resources/user/subresources/tokens/methods/verify/

### 5. Medium: The metrics poll cadence and the selected GraphQL bucket granularity do not match

- Files: `apps/api/src/crons/metrics-poll.ts`, `apps/api/src/services/cloudflare/graphql.ts`
- Details: The polling cron runs every 5 minutes, but the queried zone dataset is `httpRequests1hGroups`, which is hourly bucketed.
- Risk: The backend presents itself as near-real-time while ingesting coarse-grained traffic data for the primary polling loop.
- References:
  - `apps/api/src/crons/metrics-poll.ts:49`
  - `apps/api/src/services/cloudflare/graphql.ts:203`
  - `apps/api/src/services/cloudflare/graphql.ts:216`

## What Looks Acceptable

- The general separation of REST operations for control actions and GraphQL for analytics is directionally sound.
- The REST client has basic retry/backoff behavior for 429 responses.
- Resource sync correctly distinguishes account-scoped and zone-scoped Cloudflare resource types in structure, even though onboarding currently blocks it.

## Verdict

The Cloudflare integration layer is not production-correct yet. The largest issues are missing account discovery, unsupported mitigation implementations, deprecated or incorrect rate-limiting behavior, and polling granularity that does not match the intended monitoring model.
