# Section 01 Review: Auth, Sessions, and Tenant Isolation

## Scope

- `apps/api/src/auth/`
- `apps/api/src/routes/auth.ts`
- `apps/api/src/middleware/auth.ts`
- `apps/api/src/middleware/repos.ts`
- role enforcement and account-scoped repositories in backend routes and `packages/db/src/repositories/`

## Findings

### 1. High: Invite acceptance can create a session without authenticating the invited user

- File: `apps/api/src/routes/auth.ts`
- Details: `POST /auth/accept-invite` only requires the invite token. If the invited email already exists as a user, the handler activates the membership and creates a valid session immediately.
- Risk: If an invite token is leaked or intercepted, it can act as a login artifact for the invited user.
- References:
  - `apps/api/src/routes/auth.ts:235`
  - `apps/api/src/routes/auth.ts:265`
  - `apps/api/src/routes/auth.ts:269`

### 2. Medium: Invite flow is incomplete for brand-new users

- Files: `apps/api/src/routes/auth.ts`, `packages/shared/src/schemas/auth.ts`
- Details: When an invited email does not already map to a user, the API returns `requires_registration: true`, but the standard registration path has no invite-token branch and always creates a brand-new account.
- Risk: New-user team invites are not actually completable end-to-end.
- References:
  - `apps/api/src/routes/auth.ts:256`
  - `apps/api/src/routes/auth.ts:262`
  - `apps/api/src/routes/auth.ts:26`
  - `packages/shared/src/schemas/auth.ts:3`

### 3. Medium: OAuth identity linking is email-based instead of provider-subject-based

- Files: `apps/api/src/routes/auth.ts`, `packages/db/migrations/0001_init.sql`
- Details: The schema includes `oauth_provider` plus `oauth_id` and a unique index for provider identity, but the OAuth callback looks up by email and auto-creates users without persisting `oauth_id`.
- Risk: OAuth identity linkage is weaker than intended by the schema and may produce incorrect account linking assumptions.
- References:
  - `packages/db/migrations/0001_init.sql:15`
  - `packages/db/migrations/0001_init.sql:21`
  - `apps/api/src/routes/auth.ts:420`
  - `apps/api/src/routes/auth.ts:429`

### 4. Medium: Local development session cookies are still likely broken

- Files: `apps/api/src/auth/session.ts`, `apps/api/src/routes/auth.ts`
- Details: The cookie helper supports omitting `Secure` for localhost, but auth flows do not pass the request host into `createSession()`.
- Risk: Session cookies will default to `Secure`, which breaks plain `http://localhost` flows during development.
- References:
  - `apps/api/src/auth/session.ts:66`
  - `apps/api/src/routes/auth.ts:60`
  - `apps/api/src/routes/auth.ts:122`
  - `apps/api/src/routes/auth.ts:269`
  - `apps/api/src/routes/auth.ts:444`

## What Looks Acceptable

- Protected routers consistently apply `authMiddleware` and account-scoped repositories.
- Repository methods reviewed in `accounts`, `resources`, and `team-members` correctly scope by `account_id`.

## Open Questions

- There is no visible account-switching mechanism; login and OAuth appear to select the highest-role active membership automatically.

## Verdict

Tenant scoping is generally structured correctly, but the authentication layer is not production-safe yet because invite acceptance can mint sessions without authenticating the target user, OAuth linking is incomplete, and local session behavior is still misconfigured.
