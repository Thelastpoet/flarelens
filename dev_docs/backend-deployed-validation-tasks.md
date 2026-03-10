# Tasks: Backend Deployed Validation

## Purpose

This file tracks the post-remediation live validation work for the deployed API.

## Status Rules

- Mark tasks complete only after the live result is recorded in the evidence note.
- Keep this track separate from remediation. Use it to validate behavior, not to reopen broad review scope.
- If a live test reveals a new backend defect, create a new fix task before continuing.

## Tasks

- [x] V001 Create `dev_docs/review-docs/summaries/backend-deployed-validation-evidence.md` and record the already-proven deployed checks
- [x] V002 Record the exact deployed environment assumptions, test account policy, and cleanup rules for live validation

- [x] V003 Create and verify at least one webhook integration delivery against a controlled endpoint
  Outcome: passed. Webhook test delivery reached a controlled `webhook.site` endpoint with the expected payload, signature header, and custom header.
- [ ] V004 Create and verify at least one chat or incident integration delivery (`slack`, `discord`, `pagerduty`, or `teams`) where credentials are available
  Status: blocked. No live external credentials were available for this validation window.
- [x] V005 Validate one negative-path integration delivery and confirm failure status plus audit trail
  Outcome: passed. Failure status was confirmed (`400 VALIDATION_ERROR`) and the failed webhook test now writes an integration audit log entry.
- [x] V006 Confirm plan-limit enforcement across all integration creation routes during live validation
  Outcome: passed. A disposable free-plan account was blocked from creating a second webhook integration and received `Plan limit reached: max 1 integration`.

- [x] V007 Trigger a controlled anomaly condition against a safe test resource
  Outcome: passed. A verified disposable account was synced, a zone-scoped threshold rule was created, and the next scheduled poll evaluated it successfully.
- [x] V008 Confirm snapshot persistence, queue enqueue, queue consumer execution, and anomaly row creation for that condition
  Outcome: passed. The scheduled poll produced queue traffic and created a real anomaly row for the disposable account.
- [x] V009 Confirm alert dispatch was attempted for the anomaly and deduplication did not suppress the first valid alert
  Outcome: passed. Worker tail showed `flarelens-alert-dispatch` queue activity immediately after the first anomaly on the disposable account.

- [x] V010 Validate mitigation dry-run behavior on a non-critical resource
  Outcome: passed. A dry-run rate-limit mitigation returned the expected simulated provider action without executing a live change.
- [ ] V011 Validate one safe confirmed mitigation action on a non-critical resource
  Status: blocked. No explicitly safe non-critical production resource was designated for a real mitigation action.
- [x] V012 Confirm mitigation audit records, execution metadata, and rollback or expiry behavior where applicable
  Outcome: partial. Dry-run execution metadata and audit logging were confirmed. Live rollback or expiry behavior was not exercised because `V011` remains blocked.

- [x] V013 Observe the `*/5 * * * *` polling cron over at least one normal cycle and record the resulting writes
  Outcome: passed. The cron fired on schedule and produced snapshot/anomaly pipeline activity for the disposable account.
- [ ] V014 Observe baseline, digest, or housekeeping cron behavior over at least one expected cycle and record outcomes
- [x] V015 Confirm no repeating runtime errors appear in Worker tail logs during the cron observation window
  Outcome: passed for the polling path. After the adaptive-query change, the old repeating `metrics-poll` GraphQL access errors were no longer observed during cron validation.

- [x] V016 Write the final deployed-validation close-out summary with passed, failed, blocked, and untested items

## Follow-Up Fix Tasks

- [x] V017 Fix live plan-limit enforcement for webhook and non-Slack integration routes
- [x] V018 Add audit coverage for failed integration test executions or external delivery failures
- [x] V019 Fix the scheduled `metrics-poll` GraphQL query or access model so live polling can create snapshots and anomalies

## Exit Criteria

- [x] deployed validation evidence doc exists and is current
- [x] notifications/integrations live checks are documented
- [x] anomaly and queue path is documented
- [x] mitigation safety checks are documented
- [x] cron observation is documented
- [x] final close-out summary exists
