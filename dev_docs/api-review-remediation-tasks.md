# Tasks: API Review Remediation

**Input**: Review documents from `dev_docs/review-docs/plans/api-review-remediation-plan.md` and `dev_docs/flarelens.md`
**Prerequisites**: `dev_docs/review-docs/plans/api-review-remediation-plan.md`, current API implementation in `apps/api/`, shared types in `packages/shared/`, repositories in `packages/db/`

**Tests**: Include backend tests for the critical fixes in this plan. Add tests under `apps/api/test/`.

**Organization**: Tasks are grouped by remediation story so each area can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which remediation story this task belongs to (e.g. `US1`, `US2`)
- Include exact file paths in descriptions

## Path Conventions

- API backend: `apps/api/src/`
- API tests: `apps/api/test/`
- Shared schemas/types/constants: `packages/shared/src/`
- D1 repositories/migrations: `packages/db/src/`, `packages/db/migrations/`
- Documentation: `dev_docs/`

## Tracking Rules

- This file is the execution source of truth for remediation work.
- The finding-to-task coverage map lives in `dev_docs/review-docs/plans/api-review-traceability-matrix.md`.
- Every review finding must map to at least one task before implementation starts.
- Do not mark a task complete until:
  - the linked finding rows are updated in the traceability matrix
  - the code change is merged or otherwise accepted
  - the verification performed is recorded in task notes, PR notes, or the remediation plan
- If implementation reveals a new backend issue, add a new finding row to the traceability matrix and create a new task before continuing.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the backend workspace for remediation work and test coverage

- [x] T001 Create API test directory structure in `apps/api/test/contract/`, `apps/api/test/integration/`, and `apps/api/test/unit/`
- [x] T002 [P] Add or update API test runner configuration in `apps/api/package.json` and related Vitest config if needed
- [x] T003 [P] Document remediation scope and verification commands in `dev_docs/review-docs/plans/api-review-remediation-plan.md` or adjacent review notes if needed

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend changes that block the rest of remediation work

**⚠️ CRITICAL**: No mitigation, billing, or detection follow-up should be considered complete until this phase is done

- [x] T004 Define a Cloudflare capability model for verified tokens in `packages/shared/src/types.ts` and/or `packages/shared/src/schemas/cf-tokens.ts`
- [x] T005 [P] Extend `cf_tokens` persistence shape in `packages/db/src/repositories/cf-tokens.ts` to store derived capabilities and verification metadata
- [x] T006 [P] Update `apps/api/src/services/cloudflare/client.ts` with account discovery helpers and capability-probe methods
- [x] T007 Fix token verification flow in `apps/api/src/routes/cf-tokens.ts` to resolve `cf_account_id`, derive capabilities, and reject incomplete verification states
- [x] T008 Fix local session cookie handling by passing request host into session creation in `apps/api/src/routes/auth.ts` and any related auth helpers
- [x] T009 [P] Add foundational integration tests for token verification and localhost session behavior in `apps/api/test/integration/test_cf_token_verification.ts` and `apps/api/test/integration/test_auth_session_cookie.ts`

**Checkpoint**: Token onboarding, capability validation, and local auth behavior are reliable enough for the remaining stories

---

## Phase 3: User Story 1 - Reliable Cloudflare Onboarding & Auth (Priority: P1)

**Goal**: Ensure Cloudflare tokens are only accepted when account identity and usable capabilities are known

**Independent Test**: A valid token can be saved and verified into a usable backend state; an unusable token fails with a specific reason; localhost auth works over HTTP in development

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T010 [P] [US1] Add contract/integration test for `POST /cf-tokens/:id/verify` success path in `apps/api/test/integration/test_cf_token_verify_success.ts`
- [x] T011 [P] [US1] Add contract/integration test for `POST /cf-tokens/:id/verify` failure modes in `apps/api/test/integration/test_cf_token_verify_failures.ts`
- [x] T012 [P] [US1] Add integration test for register/login cookie behavior in `apps/api/test/integration/test_auth_cookie_host_behavior.ts`

### Implementation for User Story 1

- [x] T013 [US1] Implement Cloudflare account resolution and capability probes in `apps/api/src/services/cloudflare/client.ts`
- [x] T014 [US1] Refactor `apps/api/src/routes/cf-tokens.ts` to remove invalid `policies` assumptions and persist verified account/capability state
- [x] T015 [US1] Update `packages/db/src/repositories/cf-tokens.ts` to support reading/writing the new verification result fields
- [x] T016 [US1] Update `apps/api/src/routes/resources.ts` and `apps/api/src/services/analytics.ts` to rely on verified capability/account state instead of silent empty fallbacks
- [x] T017 [US1] Update `apps/api/src/routes/auth.ts` and `apps/api/src/auth/session.ts` so session cookies behave correctly in both localhost and deployed environments
- [x] T018 [US1] Add structured audit/error logging for verification failures in `apps/api/src/routes/cf-tokens.ts` and `apps/api/src/middleware/error-handler.ts` if needed

**Checkpoint**: Cloudflare onboarding is deterministic, debuggable, and safe to build upon

---

## Phase 4: User Story 2 - Safe and Correct Mitigation Execution (Priority: P1)

**Goal**: Remove unsupported mitigation behavior and replace it with documented, safe Cloudflare operations

**Independent Test**: Every enabled mitigation path corresponds to a valid Cloudflare API request shape, and unsafe/unsupported actions are blocked or hidden

### Tests for User Story 2 ⚠️

- [ ] T019 [P] [US2] Add unit tests for mitigation action validation in `apps/api/test/unit/test_mitigation_executor.ts`
- [ ] T020 [P] [US2] Add integration tests for mitigation route validation and opt-in safety gates in `apps/api/test/integration/test_mitigation_safety.ts`

### Implementation for User Story 2

- [ ] T021 [US2] Audit and correct Cloudflare mitigation request shapes in `apps/api/src/services/cloudflare/client.ts`
- [ ] T022 [US2] Remove, disable, or replace unsupported user-agent blocking behavior in `apps/api/src/services/cloudflare/client.ts` and `apps/api/src/services/mitigation/executor.ts`
- [ ] T023 [US2] Replace `simulate`-only rate limiting with a valid mitigation configuration in `apps/api/src/services/cloudflare/client.ts`
- [ ] T024 [US2] Add account-level safety gating and dry-run support in `apps/api/src/services/detection/index.ts`, `apps/api/src/routes/mitigations.ts`, and related shared schemas
- [ ] T025 [US2] Record mitigation request/response metadata in audit logs via `apps/api/src/middleware/audit.ts` and relevant route/service files

**Checkpoint**: Automatic mitigation paths are aligned with documented Cloudflare behavior and cannot silently do the wrong thing

---

## Phase 5: User Story 3 - Honest Billing & Budget Semantics (Priority: P2)

**Goal**: Make billing/budget features explicitly estimated unless and until real billing snapshot ingestion exists

**Independent Test**: Billing endpoints return accurate semantics, and the system no longer implies authoritative Cloudflare billing when only heuristic estimates exist

### Tests for User Story 3 ⚠️

- [ ] T026 [P] [US3] Add integration tests for `/billing/overview`, `/billing/budget`, and empty-state behavior in `apps/api/test/integration/test_billing_endpoints.ts`
- [ ] T027 [P] [US3] Add unit tests for billing projection/estimation calculations in `apps/api/test/unit/test_billing_estimations.ts`

### Implementation for User Story 3

- [ ] T028 [US3] Decide whether to implement billing snapshot ingestion or explicitly downgrade billing endpoints to estimated-only in `apps/api/src/routes/billing.ts`
- [ ] T029 [US3] If estimation remains, rename/annotate response fields and comments in `apps/api/src/routes/billing.ts` and `apps/api/src/services/analytics.ts` to reflect estimation status
- [ ] T030 [US3] Add repository/service support for snapshot population if ingestion is implemented in `packages/db/src/repositories/billing-snapshots.ts` and a new or existing cron/service file under `apps/api/src/crons/` or `apps/api/src/services/`
- [ ] T031 [US3] Add budget/audit logging for budget changes in `apps/api/src/routes/billing.ts`

**Checkpoint**: Billing and budget APIs no longer overpromise fidelity

---

## Phase 6: User Story 4 - Detection Scope Matches Product Claims (Priority: P2)

**Goal**: Align detection, baselines, and stored telemetry with what the product claims to monitor

**Independent Test**: The backend either persists real contributor data and additional monitored metrics, or the product/docs are narrowed to the implemented request-spike scope

### Tests for User Story 4 ⚠️

- [ ] T032 [P] [US4] Add unit tests for baseline recalculation and detector behavior in `apps/api/test/unit/test_baseline_recalc.ts` and `apps/api/test/unit/test_detection_pipeline.ts`
- [ ] T033 [P] [US4] Add integration test for metrics polling to anomaly-check message flow in `apps/api/test/integration/test_metrics_poll_pipeline.ts`

### Implementation for User Story 4

- [ ] T034 [US4] Expand metrics polling in `apps/api/src/crons/metrics-poll.ts` to persist contributor fields when available and to avoid writing placeholder zero-value fields where misleading
- [ ] T035 [US4] Reassess and update baseline coverage in `apps/api/src/crons/baseline-recalc.ts` and `apps/api/src/services/detection/index.ts`
- [ ] T036 [US4] Align analytics responses with actual stored/queryable data in `apps/api/src/services/analytics.ts`
- [ ] T037 [US4] If multi-service monitoring remains in scope, add the first concrete backend implementation slice for additional service metrics in `apps/api/src/services/cloudflare/graphql.ts`, `apps/api/src/services/analytics.ts`, and supporting repositories

**Checkpoint**: Detection behavior, stored data, and API responses tell the same story

---

## Phase 7: User Story 5 - Persistence, API Integrity, and Idempotency (Priority: P2)

**Goal**: Ensure persistence semantics, identity flows, queue behavior, and API contracts match actual backend guarantees

**Independent Test**: The backend can safely retry queue work, maintain stable resource/snapshot identity, complete invite/OAuth identity flows correctly, and reject invalid mutation/query behavior predictably

### Tests for User Story 5 ⚠️

- [ ] T046 [P] [US5] Add integration tests for invite acceptance, invited-user completion, and OAuth account linking in `apps/api/test/integration/test_auth_identity_flows.ts`
- [ ] T047 [P] [US5] Add integration tests for settings account updates, notification ownership, and query validation in `apps/api/test/integration/test_api_consistency.ts`
- [ ] T048 [P] [US5] Add persistence and retry-safety tests for resource uniqueness, snapshot upserts, alert deduplication, and queue idempotency in `apps/api/test/unit/test_persistence_integrity.ts` and `apps/api/test/integration/test_queue_idempotency.ts`

### Implementation for User Story 5

- [ ] T049 [US5] Fix `POST /auth/accept-invite` so invite acceptance cannot create a session without authenticating the invited user and so invited-user completion can finish without creating a new standalone account in `apps/api/src/routes/auth.ts` and related shared auth schemas
- [ ] T050 [US5] Persist and validate OAuth provider identity (`oauth_id`) in `apps/api/src/routes/auth.ts`, `packages/db/src/repositories/users.ts`, and any related D1 migration updates
- [ ] T051 [US5] Make `resources` identity type-aware and update migration/repository logic for safe uniqueness in `packages/db/migrations/` and `packages/db/src/repositories/resources.ts`
- [ ] T052 [US5] Add natural-key idempotency for `zone_snapshots` and align retention semantics between repository cleanup and housekeeping in `packages/db/migrations/`, `packages/db/src/repositories/zone-snapshots.ts`, and `apps/api/src/crons/housekeeping.ts`
- [ ] T053 [US5] Tighten alert dedup keys and queue retry idempotency in `apps/api/src/services/alerts/dedup.ts`, `apps/api/src/services/alerts/dispatcher.ts`, `apps/api/src/services/detection/index.ts`, and related persistence or cache logic
- [ ] T054 [US5] Fix `PATCH /settings/account`, notification mutation ownership, and not-found semantics in `apps/api/src/routes/settings.ts`, `apps/api/src/routes/notifications.ts`, and `packages/db/src/repositories/notifications.ts`
- [ ] T055 [US5] Standardize query validation for paginated/filter routes and reassess the custom `validate()` middleware in `apps/api/src/middleware/validate.ts` and affected routes under `apps/api/src/routes/`
- [ ] T056 [US5] Ensure budget state can be persisted independently of an active billing snapshot in `packages/db/src/repositories/billing-snapshots.ts`, `apps/api/src/routes/billing.ts`, and any supporting account/settings storage

**Checkpoint**: Persistence rules, identity flows, and API behavior are explicit and retry-safe

---

## Phase 8: User Story 6 - Redundancy, Security, and Platform Cleanup (Priority: P3)

**Goal**: Remove dead or conflicting platform/framework code and align security-sensitive paths with intended runtime behavior

**Independent Test**: Contributors can tell which bindings, auth modes, rate-limiting semantics, and telemetry paths are truly supported by the backend

### Implementation for User Story 6

- [ ] T057 [US6] Align developer-token security model by role-gating issuance and deciding whether bearer API-token auth is supported in `apps/api/src/routes/developer.ts`, `apps/api/src/middleware/api-token-auth.ts`, and related shared auth contracts
- [ ] T058 [US6] Correct secret/config contracts for `TOKEN_ENCRYPTION_KEY` and `SESSION_SECRET` in `apps/api/src/env.ts`, `apps/api/src/auth/crypto.ts`, and relevant developer docs
- [ ] T059 [US6] Replace KV-backed rate limiting with an intentional strategy or explicitly document it as best-effort throttling in `apps/api/src/middleware/rate-limit.ts` and related operational docs
- [ ] T060 [US6] Decide whether Analytics Engine remains in scope and either wire it into the metrics pipeline or remove the unused binding/config from `apps/api/wrangler.jsonc`, `apps/api/src/env.ts`, and telemetry code
- [ ] T061 [US6] Remove or intentionally wire unused renderer/package/bindings such as `apps/api/src/renderer.tsx`, `vite-ssr-components`, and `REPORTS`
- [ ] T062 [US6] Align supported metric/rule surfaces with implemented detection by disabling unsupported cost-oriented options or implementing backend support in `packages/shared/src/schemas/rules.ts`, `apps/api/src/routes/mitigations.ts`, and detection services
- [ ] T063 [US6] Align metrics polling cadence with the selected GraphQL dataset granularity in `apps/api/src/crons/metrics-poll.ts` and `apps/api/src/services/cloudflare/graphql.ts`

**Checkpoint**: Dead code, misleading bindings, and security-drifting auth/config paths are removed or made explicit

---

## Phase 9: User Story 7 - Documentation & Scope Correction (Priority: P3)

**Goal**: Bring product and technical docs in line with the actual Cloudflare-native backend and its constraints

**Independent Test**: A new contributor can read the docs and not come away with incorrect assumptions about stack, billing fidelity, onboarding, or mitigation capability

### Implementation for User Story 7

- [ ] T038 [US7] Update product assumptions and MVP boundaries in `dev_docs/flarelens.md`
- [ ] T039 [P] [US7] Update technical architecture details in `dev_docs/technical_architecture.md` to reflect current backend reality and any remediation changes
- [ ] T040 [P] [US7] Cross-link review artifacts in `dev_docs/review-docs/plans/api-review-remediation-plan.md`, `dev_docs/review-docs/plans/api-review-traceability-matrix.md`, and `dev_docs/api-review-remediation-tasks.md`
- [ ] T041 [US7] Add explicit notes about estimated billing, capability verification, mitigation constraints, and currently supported detection scope in `dev_docs/flarelens.md`

**Checkpoint**: Product and engineering docs are usable as implementation references

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple remediation stories

- [ ] T042 [P] Run `pnpm check`, `pnpm lint`, and relevant API test commands and record outcomes in `dev_docs/review-docs/plans/api-review-remediation-plan.md` or PR notes
- [ ] T043 Review route coverage and decide where `apps/api/src/middleware/api-token-auth.ts` should be mounted or document why developer tokens remain unused
- [ ] T044 [P] Clean up misleading comments and placeholder language across `apps/api/src/`
- [ ] T045 Security review of token storage, audit coverage, and mitigation execution paths across `apps/api/src/` and `packages/db/src/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on Foundational completion; should not ship before US1
- **User Story 3 (Phase 5)**: Depends on Foundational completion; can proceed after US1
- **User Story 4 (Phase 6)**: Depends on Foundational completion; benefits from US1 and US3
- **User Story 5 (Phase 7)**: Depends on Foundational completion; should land before docs are finalized
- **User Story 6 (Phase 8)**: Depends on earlier implementation decisions in US1-US5
- **User Story 7 (Phase 9)**: Should follow the implementation decisions from earlier stories
- **Polish (Phase 10)**: Depends on all desired remediation stories being complete

### User Story Dependencies

- **US1**: No dependency on other stories after Foundational
- **US2**: Depends operationally on US1 because mitigation safety assumes valid account/capability state
- **US3**: Can start after Foundational, but output wording should reflect US1 onboarding semantics
- **US4**: Can start after Foundational; best done after US1 because analytics inputs depend on valid verified tokens
- **US5**: Depends on decisions made in US1-US4 because persistence and API contract fixes touch those paths directly
- **US6**: Depends on decisions made in US1-US5 because cleanup should follow chosen runtime behavior
- **US7**: Depends on decisions made in US1-US6

### Within Each User Story

- Write tests first and confirm they fail
- Update shared schemas/types before route/service logic when shapes change
- Update repositories before route handlers that depend on new persistence fields
- Complete logging and validation before calling the story done

### Parallel Opportunities

- `T004`, `T005`, and `T006` can be split across shared, DB, and client code
- Test tasks marked `[P]` within each story can run in parallel
- Documentation tasks in US7 can run in parallel after implementation stabilizes

---

## Parallel Example: User Story 1

```bash
# Write failing verification/auth tests in parallel:
Task: "Add contract/integration test for POST /cf-tokens/:id/verify success path in apps/api/test/integration/test_cf_token_verify_success.ts"
Task: "Add contract/integration test for POST /cf-tokens/:id/verify failure modes in apps/api/test/integration/test_cf_token_verify_failures.ts"
Task: "Add integration test for register/login cookie behavior in apps/api/test/integration/test_auth_cookie_host_behavior.ts"

# Then implement shared and persistence groundwork in parallel:
Task: "Define a Cloudflare capability model in packages/shared/src/types.ts and/or packages/shared/src/schemas/cf-tokens.ts"
Task: "Extend cf_tokens persistence shape in packages/db/src/repositories/cf-tokens.ts"
```

---

## Implementation Strategy

### First (P1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1
4. Complete Phase 4: US2
5. Validate onboarding and mitigation safety before moving on
6. Complete persistence/API integrity closure before final doc rewrites

### Incremental Delivery

1. Fix onboarding/auth correctness
2. Remove or correct unsafe mitigations
3. Make billing semantics honest
4. Align detection depth with product claims
5. Close persistence, idempotency, and API consistency gaps
6. Remove misleading platform/framework surface
7. Rewrite docs to match reality

### Notes

- Prefer small, reviewable PRs by phase or by user story
- Do not ship mitigation automation changes without explicit safety validation
- Keep documentation changes tied to actual implementation decisions, not aspirational future scope
- Update the traceability matrix whenever a task is added, split, blocked, or completed
