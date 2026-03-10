# API Review Traceability Matrix

## Purpose

This document maps every backend review finding to one or more remediation task IDs from `dev_docs/api-review-remediation-tasks.md`.

Use it to answer four questions quickly:

1. Has every reviewed issue been assigned implementation work?
2. Which tasks close a specific finding?
3. Which findings are still only partially covered?
4. When a task is finished, which findings can be marked resolved?

## Status Rules

- `Mapped`: finding has task coverage but is not yet resolved
- `In Progress`: linked implementation has started
- `Resolved`: linked tasks are complete and verification has been recorded
- `Blocked`: resolution depends on another unfinished task or decision

## Coverage Result

- All current section-review findings are mapped to at least one task.
- Gap-closure tasks added during traceability pass: `T046` through `T063`.

---

## Section Findings

### Section 01: Auth, Sessions, and Tenant Isolation

- `S01-F01` High. Invite acceptance can create a session without authenticating the invited user. Tasks: `T046`, `T049`. Status: `Mapped`
- `S01-F02` Medium. Invite flow is incomplete for brand-new users. Tasks: `T046`, `T049`. Status: `Mapped`
- `S01-F03` Medium. OAuth identity linking is email-based instead of provider-subject-based. Tasks: `T046`, `T050`. Status: `Mapped`
- `S01-F04` Medium. Local development session cookies are still likely broken. Tasks: `T008`, `T009`, `T012`, `T017`. Status: `Resolved`

### Section 02: Secrets, Tokens, and Security

- `S02-F01` High. Developer-token issuance is not role-gated while developer-token auth grants admin access. Tasks: `T057`. Status: `Mapped`
- `S02-F02` Medium. Cloudflare token verification does not prove usable permissions or safe operational state. Tasks: `T004`, `T005`, `T006`, `T007`, `T010`, `T011`, `T013`, `T014`, `T015`, `T018`. Status: `Resolved`
- `S02-F03` Medium. Encryption-key format documentation is inconsistent with the implementation. Tasks: `T058`. Status: `Mapped`

### Section 03: Cloudflare Integration Correctness

- `S03-F01` High. Cloudflare account discovery is not actually implemented. Tasks: `T004`, `T005`, `T006`, `T007`, `T013`, `T014`, `T015`, `T016`. Status: `Resolved`
- `S03-F02` High. User-agent blocking is implemented against the wrong Cloudflare API. Tasks: `T019`, `T020`, `T021`, `T022`, `T024`. Status: `Mapped`
- `S03-F03` High. Rate-limiting mitigation uses a deprecated API shape and does not perform a real mitigation. Tasks: `T019`, `T020`, `T021`, `T023`, `T024`. Status: `Mapped`
- `S03-F04` Medium. “Verified permissions” are derived from assumptions not backed by the current token-verify response. Tasks: `T004`, `T006`, `T007`, `T013`, `T014`. Status: `Resolved`
- `S03-F05` Medium. Metrics poll cadence and GraphQL bucket granularity do not match. Tasks: `T063`. Status: `Mapped`

### Section 04: Data Model and Persistence

- `S04-F01` High. Resource identity is keyed too broadly and can collide across Cloudflare product types. Tasks: `T048`, `T051`. Status: `Mapped`
- `S04-F02` High. Zone snapshot “upsert” is not idempotent because there is no natural-key conflict target. Tasks: `T048`, `T052`. Status: `Mapped`
- `S04-F03` Medium. Snapshot retention logic is inconsistent about whether age is based on event time or insert time. Tasks: `T048`, `T052`. Status: `Mapped`
- `S04-F04` Medium. Budget persistence is tied to the existence of an active billing snapshot. Tasks: `T026`, `T028`, `T030`, `T031`, `T056`. Status: `Mapped`

### Section 05: Detection, Queues, and Cron Jobs

- `S05-F01` High. Alert deduplication is keyed too broadly and can suppress distinct incidents. Tasks: `T048`, `T053`. Status: `Mapped`
- `S05-F02` High. Queue processing is not idempotent enough to prevent duplicate anomalies or duplicate alert fan-out. Tasks: `T048`, `T053`. Status: `Mapped`
- `S05-F03` Medium. Polling cron stores placeholder values as if they were measured analytics. Tasks: `T033`, `T034`, `T036`. Status: `Mapped`
- `S05-F04` Medium. End-to-end detection pipeline currently covers only request-count anomalies. Tasks: `T032`, `T033`, `T035`, `T037`, `T062`. Status: `Mapped`

### Section 06: Billing and Cost Semantics

- `S06-F01` High. Billing API surface is not backed by any ingestion path. Tasks: `T026`, `T028`, `T030`, `T056`. Status: `Mapped`
- `S06-F02` High. Estimated cost and billing-style language are mixed without a clear contract. Tasks: `T026`, `T027`, `T028`, `T029`, `T031`, `T041`. Status: `Mapped`
- `S06-F03` Medium. Cost model is approximate but exposed as durable business logic. Tasks: `T027`, `T029`, `T041`. Status: `Mapped`
- `S06-F04` Medium. Cost- and budget-oriented rule surfaces exist, but the detection pipeline does not feed them. Tasks: `T037`, `T062`. Status: `Mapped`

### Section 07: Validation, Error Handling, and API Consistency

- `S07-F01` Medium. `PATCH /settings/account` accepts `name` but does not update the account name column. Tasks: `T047`, `T054`. Status: `Mapped`
- `S07-F02` Medium. Notification mutation routes do not enforce per-user ownership and do not report not-found cases. Tasks: `T047`, `T054`. Status: `Mapped`
- `S07-F03` Medium. Query parameter validation is inconsistent and largely absent. Tasks: `T047`, `T055`. Status: `Mapped`
- `S07-F04` Medium. The custom validation layer is narrower than the framework patterns the API already depends on. Tasks: `T055`. Status: `Mapped`

### Section 08: Redundancy and Dead Code

- `S08-F01` High. Custom API rate limiter reimplements a platform concern on top of KV. Tasks: `T059`. Status: `Mapped`
- `S08-F02` Medium. Analytics Engine is provisioned but not actually used. Tasks: `T060`. Status: `Mapped`
- `S08-F03` Medium. Developer-token auth middleware exists but is not mounted on live routes. Tasks: `T043`, `T057`. Status: `Mapped`
- `S08-F04` Medium. Several configured bindings and packages appear unused. Tasks: `T058`, `T061`. Status: `Mapped`

### Section 09: Documentation Alignment

- `S09-F01` High. `flarelens.md` no longer matches the actual backend architecture or current scope. Tasks: `T038`, `T041`. Status: `Mapped`
- `S09-F02` High. `technical_architecture.md` describes target-state subsystems as if they are implemented. Tasks: `T039`, `T040`. Status: `Mapped`
- `S09-F03` Medium. Documented API contract does not fully match mounted routes and behaviors. Tasks: `T039`, `T054`. Status: `Mapped`
- `S09-F04` Medium. Migration and repository documentation overstates the current repo layout. Tasks: `T039`, `T040`. Status: `Mapped`

### Section 10: Test and Verification Coverage

- `S10-F01` High. Backend has no committed automated tests and no API-level test script. Tasks: `T001`, `T002`. Status: `Mapped`
- `S10-F02` High. Critical production-sensitive flows have no visible verification harness. Tasks: `T009`, `T010`, `T011`, `T012`, `T019`, `T020`, `T026`, `T027`, `T032`, `T033`, `T042`, `T046`, `T047`, `T048`. Status: `Mapped`
- `S10-F03` Medium. Test tooling is only partially present. Tasks: `T001`, `T002`. Status: `Mapped`
- `S10-F04` Medium. Documented CI/testing workflow does not match current package scripts. Tasks: `T002`, `T039`, `T042`. Status: `Mapped`

---

## Cross-Cutting Summary Coverage

These findings come from `dev_docs/review-docs/summaries/api-redundancy-conflict-review.md`. They overlap with the section findings above but remain useful as thematic checks during implementation.

- `SUM-F01` KV-based rate limiting is a poor fit for strict limits. Tasks: `T059`. Status: `Mapped`
- `SUM-F02` Analytics Engine is provisioned but unused. Tasks: `T060`. Status: `Mapped`
- `SUM-F03` Mitigation behavior is implemented as if Cloudflare is simpler than it is. Tasks: `T021`, `T022`, `T023`, `T024`. Status: `Mapped`
- `SUM-F04` Developer-token auth exists but is not mounted. Tasks: `T043`, `T057`. Status: `Mapped`
- `SUM-F05` `SESSION_SECRET` is declared but unused. Tasks: `T058`, `T061`. Status: `Mapped`
- `SUM-F06` Custom request validation is narrower than the framework surface. Tasks: `T055`. Status: `Mapped`
- `SUM-F07` API renderer dependencies appear unused. Tasks: `T061`. Status: `Mapped`
- `SUM-F08` Route/schema handling is manual and not positioned for contract generation. Tasks: `T055`. Status: `Mapped`

---

## How To Maintain This Matrix

When a task starts:

- change the linked finding rows from `Mapped` to `In Progress` if that task is the active closure path

When a task finishes:

- confirm the implementation actually addresses the finding
- record the verification performed
- change the finding row to `Resolved`

When a task only partially fixes a finding:

- keep the finding row at `Mapped` or `Blocked`
- add another task before closing the original one
