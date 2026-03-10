# Section 08 Review: Redundancy and Dead Code

## Scope

- `apps/api/src/middleware/rate-limit.ts`
- `apps/api/src/middleware/api-token-auth.ts`
- `apps/api/src/env.ts`
- `apps/api/wrangler.jsonc`
- `apps/api/package.json`
- `apps/api/src/renderer.tsx`

## Findings

### 1. High: The custom API rate limiter reimplements a platform concern on top of KV

- Files: `apps/api/src/middleware/rate-limit.ts`
- Details: Rate limiting is implemented by reading and rewriting counters in Workers KV. That is both custom middleware and the wrong consistency model for strict per-window enforcement.
- Risk: The backend carries manual complexity while still getting race-prone semantics under concurrent load.
- References:
  - `apps/api/src/middleware/rate-limit.ts:7`
  - `apps/api/src/middleware/rate-limit.ts:14`
  - `apps/api/src/middleware/rate-limit.ts:23`
  - `apps/api/src/middleware/rate-limit.ts:34`

### 2. Medium: Analytics Engine is provisioned but not actually used

- Files: `apps/api/wrangler.jsonc`, `apps/api/src/env.ts`
- Details: The Worker binds an Analytics Engine dataset and declares it in the runtime env, but I did not find any writes to `env.ANALYTICS`.
- Risk: This is dead operational surface now, and it invites future telemetry duplication if someone later starts writing to Analytics Engine without removing the existing D1 snapshot path.
- References:
  - `apps/api/wrangler.jsonc:70`
  - `apps/api/wrangler.jsonc:73`
  - `apps/api/src/env.ts:16`

### 3. Medium: Developer-token auth middleware exists but is not mounted on live routes

- Files: `apps/api/src/middleware/api-token-auth.ts`
- Details: The code implements a full bearer-token authentication path, but route mounting uses the cookie-based `authMiddleware` instead.
- Risk: This is dead security-sensitive code that can drift from the actual auth model and mislead contributors about what the API supports.
- References:
  - `apps/api/src/middleware/api-token-auth.ts:20`
  - `apps/api/src/middleware/api-token-auth.ts:24`
  - `apps/api/src/middleware/api-token-auth.ts:54`

### 4. Medium: Several configured bindings and packages appear unused

- Files: `apps/api/package.json`, `apps/api/src/renderer.tsx`, `apps/api/src/env.ts`, `apps/api/wrangler.jsonc`
- Details: The API includes `vite-ssr-components` and a JSX renderer that do not appear to be wired into the Worker. `REPORTS` and `SESSION_SECRET` are declared in the environment model but are not used by application code.
- Risk: Dead package/config surface increases maintenance overhead and makes the backend look broader than it really is.
- References:
  - `apps/api/package.json:26`
  - `apps/api/src/renderer.tsx:1`
  - `apps/api/src/env.ts:10`
  - `apps/api/src/env.ts:29`
  - `apps/api/wrangler.jsonc:37`

## What Looks Acceptable

- The Durable Object live-feed binding is actually exercised by the polling and websocket paths.
- The custom encryption and session layers are not automatically redundant; they are application-specific enough to justify existence if their contracts are cleaned up.

## Verdict

The backend currently carries too much inactive or partially active surface area. The main cleanup targets are the KV-based rate limiter, unused Analytics Engine and R2 bindings, the dormant developer-token auth path, and the unused renderer/package stack.
