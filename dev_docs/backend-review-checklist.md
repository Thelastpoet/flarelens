# Backend Review Checklist

## Purpose

Use this checklist to review the API backend for production readiness. This is intended for systematic senior review of `apps/api/`, `packages/db/`, and relevant shared backend contracts in `packages/shared/`.

## Review Scope

- API routes and middleware in `apps/api/src/routes/` and `apps/api/src/middleware/`
- Auth, sessions, token handling, and encryption in `apps/api/src/auth/`
- Cloudflare integration in `apps/api/src/services/cloudflare/`
- Detection, analytics, queues, crons, and mitigations in `apps/api/src/services/`, `apps/api/src/queues/`, and `apps/api/src/crons/`
- Persistence and tenant isolation in `packages/db/src/`
- Shared backend types and schemas in `packages/shared/src/`
- Worker bindings and runtime config in `apps/api/wrangler.jsonc` and `apps/api/src/env.ts`

## 1. Auth, Sessions, and Tenant Isolation

- [ ] Session creation, validation, expiration, and logout behavior are correct in local and production environments
- [ ] Cookie settings match actual deployment behavior and do not break localhost auth
- [ ] Every protected route uses the intended auth middleware
- [ ] Account scoping is enforced in repositories and route handlers
- [ ] Team role checks are correct and cannot be bypassed
- [ ] Dead or unused auth paths are removed or explicitly wired

## 2. Secrets, Tokens, and Security

- [ ] Cloudflare tokens and integration secrets are encrypted at rest
- [ ] No sensitive values are returned in API responses or logs
- [ ] Required env vars are real requirements, not stale declarations
- [ ] Token verification proves actual usable capability, not just token existence
- [ ] Audit logging exists for security-sensitive actions
- [ ] Error responses do not leak internal secrets or stack traces

## 3. Cloudflare Integration Correctness

- [ ] Every Cloudflare REST/GraphQL call matches current official API behavior
- [ ] Account ID, zone ID, and resource identity are resolved reliably during onboarding
- [ ] Capability assumptions are verified against actual follow-up API calls
- [ ] Mitigation actions map to documented Cloudflare products and request shapes
- [ ] The code does not duplicate Cloudflare-native primitives unnecessarily

## 4. Data Model and Persistence

- [ ] D1 schema matches repository usage
- [ ] Repository methods enforce account isolation consistently
- [ ] Upserts, uniqueness assumptions, and lifecycle states are correct
- [ ] Placeholder or partially populated data is not presented as complete truth
- [ ] Migrations cover all backend fields actually relied upon in code

## 5. Detection, Queues, and Cron Jobs

- [ ] Polling, anomaly detection, alert dispatch, and mitigation flow are coherent end to end
- [ ] Queue handlers are idempotent or safely retryable
- [ ] Cron jobs cannot silently produce misleading data
- [ ] Baselines and anomaly logic match the metrics actually stored
- [ ] Alert deduplication and cooldown behavior are correct

## 6. Billing and Cost Semantics

- [ ] Cost figures are labeled accurately as estimated or authoritative
- [ ] Billing endpoints are backed by real ingestion or intentionally constrained
- [ ] Product language does not overstate what backend cost calculations mean
- [ ] Budget thresholds and billing alerts use valid underlying data

## 7. Validation, Error Handling, and API Consistency

- [ ] Input validation is standardized across routes
- [ ] Route behavior, schemas, and returned payloads are consistent
- [ ] Pagination, filtering, and not-found handling are predictable
- [ ] Error codes and status codes are meaningful and stable
- [ ] Manual middleware is justified and not duplicating framework features without benefit

## 8. Redundancy and Dead Code

- [ ] Unused packages, bindings, renderer paths, or middleware are removed
- [ ] Manual implementations do not duplicate framework/package behavior unnecessarily
- [ ] Cloudflare-native capabilities are not reimplemented incorrectly in app code
- [ ] Feature flags, placeholders, and future-scope code are clearly marked or removed

## 9. Documentation Alignment

- [ ] `dev_docs/flarelens.md` matches actual backend scope and constraints
- [ ] `dev_docs/technical_architecture.md` reflects the real deployed architecture
- [ ] Runtime config, required permissions, and operational assumptions are documented
- [ ] MVP versus future-feature boundaries are explicit

## 10. Test and Verification Coverage

- [ ] Critical auth and token flows have integration coverage
- [ ] Cloudflare integration paths are tested or safely mocked
- [ ] Queue/cron behavior has at least focused unit or integration coverage
- [ ] Billing and detection logic have coverage for edge cases
- [ ] Review conclusions are backed by code references and, where needed, official docs

## Recommended Review Order

1. Auth, sessions, tokens, and tenant isolation
2. Cloudflare onboarding and capability verification
3. Detection, queues, crons, and mitigations
4. Billing and cost semantics
5. Validation, redundancy, and dead code
6. Documentation alignment

## Exit Criteria

The backend should not be considered production-ready until:

- critical auth and Cloudflare integration risks are closed
- mitigation behavior is documented and correct
- billing semantics are honest
- dead security-sensitive code is removed or intentionally used
- documentation and implementation tell the same story
