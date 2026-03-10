# Section 07 Review: Validation, Error Handling, and API Consistency

## Scope

- `apps/api/src/middleware/validate.ts`
- `apps/api/src/middleware/error-handler.ts`
- `apps/api/src/routes/*.ts`
- `packages/shared/src/errors.ts`
- `packages/shared/src/schemas/settings.ts`
- `packages/shared/src/types.ts`
- `packages/db/src/repositories/notifications.ts`

## Findings

### 1. Medium: `PATCH /settings/account` accepts `name` but does not update the account name column

- Files: `packages/shared/src/schemas/settings.ts`, `apps/api/src/routes/settings.ts`
- Details: The schema accepts `name`, and `GET /settings/account` returns `account.name`, but the patch route stores `input.name` inside the JSON settings blob as `account_name` instead of updating `accounts.name`.
- Risk: Clients can send a valid request, receive success, and still not see the account name change in the canonical account payload.
- References:
  - `packages/shared/src/schemas/settings.ts:8`
  - `apps/api/src/routes/settings.ts:95`
  - `apps/api/src/routes/settings.ts:99`
  - `apps/api/src/routes/settings.ts:109`

### 2. Medium: Notification mutation routes do not enforce per-user ownership and do not report not-found cases

- Files: `packages/db/src/repositories/notifications.ts`, `apps/api/src/routes/notifications.ts`
- Details: Listing notifications is scoped to `session.user_id` plus global notifications, but `PATCH /notifications/:id/read` updates by `id` and `account_id` only and always returns success.
- Risk: A user can mutate another user’s account-scoped notification if they know the ID, and clients cannot tell whether the target notification actually existed or was mutable.
- References:
  - `packages/db/src/repositories/notifications.ts:21`
  - `packages/db/src/repositories/notifications.ts:87`
  - `apps/api/src/routes/notifications.ts:21`
  - `apps/api/src/routes/notifications.ts:30`
  - `apps/api/src/routes/notifications.ts:34`

### 3. Medium: Query parameter validation is inconsistent and largely absent

- Files: `apps/api/src/routes/anomalies.ts`, `apps/api/src/routes/notifications.ts`, `apps/api/src/routes/audit-logs.ts`, `apps/api/src/routes/analytics.ts`
- Details: Pagination and limit values are parsed ad hoc with unary `+` or `parseInt()` and are never schema-validated.
- Risk: Negative values, zero, or `NaN` can flow into repository pagination or analytics handlers, making route behavior unpredictable across endpoints.
- References:
  - `apps/api/src/routes/anomalies.ts:19`
  - `apps/api/src/routes/anomalies.ts:26`
  - `apps/api/src/routes/notifications.ts:15`
  - `apps/api/src/routes/notifications.ts:23`
  - `apps/api/src/routes/audit-logs.ts:22`
  - `apps/api/src/routes/analytics.ts:45`
  - `apps/api/src/routes/analytics.ts:47`

### 4. Medium: The custom validation layer is narrower than the framework patterns the API already depends on

- Files: `apps/api/src/middleware/validate.ts`
- Details: `validate()` always parses JSON bodies and sets a custom `validatedBody` value. It does not cover query params, path params, headers, or forms, and it duplicates Hono’s established validation flow instead of standardizing on it.
- Risk: Validation coverage will stay fragmented as the API grows, and contributors have to remember a custom convention that still leaves many input surfaces unvalidated.
- References:
  - `apps/api/src/middleware/validate.ts:5`
  - `apps/api/src/middleware/validate.ts:9`
  - `apps/api/src/middleware/validate.ts:19`

## What Looks Acceptable

- The centralized error handler correctly normalizes `AppError` instances and suppresses stack traces from API responses.
- Most mutation routes use `NotFoundError`, `ConflictError`, or `ValidationError` consistently once they explicitly load a target record.
- The shared error classes give the project a usable base contract; the larger issue is uneven adoption across route surfaces.

## Verdict

The API has the beginnings of a coherent error model, but validation and route behavior are still inconsistent. The biggest issues are accepted-but-ineffective updates, weak query validation, notification mutation semantics that do not match listing semantics, and a custom validator that is too narrow for the shape of this backend.
