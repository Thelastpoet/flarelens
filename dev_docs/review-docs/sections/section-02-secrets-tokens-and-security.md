# Section 02 Review: Secrets, Tokens, and Security

## Scope

- `apps/api/src/auth/crypto.ts`
- `apps/api/src/routes/cf-tokens.ts`
- `apps/api/src/routes/integrations.ts`
- `apps/api/src/routes/developer.ts`
- `apps/api/src/middleware/api-token-auth.ts`
- `apps/api/src/middleware/error-handler.ts`
- `apps/api/src/middleware/audit.ts`
- `apps/api/src/env.ts`

## Findings

### 1. High: Developer-token issuance is not role-gated, while developer-token auth grants admin access

- Files: `apps/api/src/routes/developer.ts`, `apps/api/src/middleware/api-token-auth.ts`
- Details: Any authenticated user on the account can create developer tokens because the developer routes do not require `admin` or `editor`. The developer-token auth middleware then maps any accepted token to `role: 'admin'`.
- Risk: This is a latent privilege-escalation path. Even though the middleware is not mounted on active routes today, the issued tokens are being treated as admin-equivalent by design.
- References:
  - `apps/api/src/routes/developer.ts:30`
  - `apps/api/src/routes/developer.ts:42`
  - `apps/api/src/middleware/api-token-auth.ts:20`
  - `apps/api/src/middleware/api-token-auth.ts:42`
  - `apps/api/src/middleware/api-token-auth.ts:45`

### 2. Medium: Cloudflare token verification does not prove usable permissions or safe operational state

- File: `apps/api/src/routes/cf-tokens.ts`
- Details: Token verification checks only token status and then derives permissions from `verifyResult.policies`, which are not reliably present in the current implementation assumptions. It also marks the token verified even if `cf_account_id` is still empty.
- Risk: A token can be marked “verified” without proving that it can perform the account- and zone-scoped operations the backend actually needs.
- References:
  - `apps/api/src/routes/cf-tokens.ts:55`
  - `apps/api/src/routes/cf-tokens.ts:82`
  - `apps/api/src/routes/cf-tokens.ts:87`
  - `apps/api/src/routes/cf-tokens.ts:89`

### 3. Medium: Encryption-key format documentation is inconsistent with the implementation

- Files: `apps/api/src/env.ts`, `apps/api/src/auth/crypto.ts`
- Details: The runtime env documents `TOKEN_ENCRYPTION_KEY` as base64, but the crypto implementation requires a 64-character hex string.
- Risk: This can cause broken deployments, incorrect secret provisioning, and operational confusion around a security-critical secret.
- References:
  - `apps/api/src/env.ts:28`
  - `apps/api/src/auth/crypto.ts:35`
  - `apps/api/src/auth/crypto.ts:43`

## What Looks Acceptable

- Cloudflare tokens and integration secrets are encrypted before storage.
- CF token listing masks `encrypted_token` and integration listing strips encrypted config from API responses.
- The global error handler does not expose stack traces to clients for unexpected errors.
- Audit logging exists for many security-sensitive mutations and intentionally avoids failing the primary request.

## Open Questions

- Developer-token auth is not mounted on active routers today. The risk becomes immediately exploitable if that middleware is attached later without tightening issuance rules.

## Verdict

Secret-at-rest handling is mostly reasonable, but token security is not production-safe yet because developer-token issuance and developer-token privilege mapping are mismatched, and Cloudflare token verification overstates what “verified” currently means.
