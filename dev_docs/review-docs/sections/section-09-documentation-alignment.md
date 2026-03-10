# Section 09 Review: Documentation Alignment

## Scope

- `dev_docs/flarelens.md`
- `dev_docs/technical_architecture.md`
- `apps/api/wrangler.jsonc`
- `apps/api/src/index.tsx`
- `apps/api/src/env.ts`
- `apps/api/src/routes/mitigations.ts`
- `apps/api/src/routes/settings.ts`
- `apps/api/src/services/alerts/dispatcher.ts`
- `packages/db/src/index.ts`

## Findings

### 1. High: `flarelens.md` no longer matches the actual backend architecture or current scope

- Files: `dev_docs/flarelens.md`, `apps/api/wrangler.jsonc`, `apps/api/src/index.tsx`, `apps/api/src/routes/mitigations.ts`
- Details: The product doc still describes a generic Node/Python + Next/React + PostgreSQL + Redis stack and says Guardian Mode is a future feature excluded from MVP. The codebase is a Cloudflare Workers/Hono backend with D1, KV, Queues, Durable Objects, and already shipped mitigation routes.
- Risk: Contributors reading the product brief will form the wrong mental model about both the deployment platform and the current feature boundary.
- References:
  - `dev_docs/flarelens.md:124`
  - `dev_docs/flarelens.md:178`
  - `dev_docs/flarelens.md:201`
  - `apps/api/wrangler.jsonc:14`
  - `apps/api/wrangler.jsonc:45`
  - `apps/api/wrangler.jsonc:78`
  - `apps/api/src/index.tsx:43`
  - `apps/api/src/routes/mitigations.ts:39`

### 2. High: `technical_architecture.md` describes several target-state subsystems as if they are implemented

- Files: `dev_docs/technical_architecture.md`, `apps/api/wrangler.jsonc`, `apps/api/src/env.ts`, `apps/api/src/services/alerts/dispatcher.ts`, `packages/db/src/index.ts`
- Details: The architecture doc centers Analytics Engine, R2 storage, Durable-Object-based rate limiting, and D1 `alert_deliveries` recording. The code binds some of that infrastructure, but Analytics Engine and R2 are unused, the rate limiter is KV-based, and there is no alert-deliveries repository or write path.
- Risk: The document reads like production truth, but important operational claims are still aspirational.
- References:
  - `dev_docs/technical_architecture.md:79`
  - `dev_docs/technical_architecture.md:80`
  - `dev_docs/technical_architecture.md:83`
  - `dev_docs/technical_architecture.md:107`
  - `dev_docs/technical_architecture.md:122`
  - `dev_docs/technical_architecture.md:178`
  - `apps/api/wrangler.jsonc:37`
  - `apps/api/wrangler.jsonc:70`
  - `apps/api/src/env.ts:10`
  - `apps/api/src/env.ts:17`
  - `apps/api/src/services/alerts/dispatcher.ts:105`
  - `packages/db/src/index.ts:1`

### 3. Medium: The documented API contract does not fully match the mounted routes and behaviors

- Files: `dev_docs/technical_architecture.md`, `apps/api/src/index.tsx`, `apps/api/src/routes/settings.ts`
- Details: The architecture doc declares a `/v1` base URL, but the Worker mounts routes at the root. It also says `PATCH /settings/profile` updates `name, email`, while the actual route updates `name` and `avatar_url`.
- Risk: Internal consumers and future contributors can build against the wrong contract even when the backend itself is stable.
- References:
  - `dev_docs/technical_architecture.md:240`
  - `dev_docs/technical_architecture.md:350`
  - `apps/api/src/index.tsx:29`
  - `apps/api/src/index.tsx:45`
  - `apps/api/src/routes/settings.ts:32`

### 4. Medium: The migration and repository documentation overstates the current repo layout

- Files: `dev_docs/technical_architecture.md`, `apps/api/wrangler.jsonc`, `packages/db/src/index.ts`
- Details: The architecture doc describes a multi-file migration history and a broader persistence surface than the repository currently exposes. The actual project points Wrangler at a single `packages/db/migrations` directory whose current schema is represented by `0001_init.sql`.
- Risk: Onboarding, schema review, and incident debugging become harder because the documented storage layout does not match the real repository.
- References:
  - `dev_docs/technical_architecture.md:1464`
  - `dev_docs/technical_architecture.md:1473`
  - `apps/api/wrangler.jsonc:20`
  - `packages/db/src/index.ts:1`

## What Looks Acceptable

- `technical_architecture.md` is directionally aligned with the Cloudflare-native deployment model and captures the major backend domains.
- The docs correctly recognize Hono, D1, KV, Queues, and Durable Objects as the core runtime building blocks.

## Verdict

The documentation set currently mixes implemented backend behavior with planned architecture. `flarelens.md` is materially outdated, and `technical_architecture.md` needs to be reframed as either “current state” or “target state,” because right now it blends both in ways that will mislead contributors.
