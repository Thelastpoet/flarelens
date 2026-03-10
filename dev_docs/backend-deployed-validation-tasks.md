# Tasks: Backend Deployed Validation

## Purpose

This file tracks the post-remediation live validation work for the deployed API.

## Status Rules

- Mark tasks complete only after the live result is recorded in the evidence note.
- Keep this track separate from remediation. Use it to validate behavior, not to reopen broad review scope.
- If a live test reveals a new backend defect, create a new fix task before continuing.

## Tasks

- [ ] V001 Create `dev_docs/review-docs/summaries/backend-deployed-validation-evidence.md` and record the already-proven deployed checks
- [ ] V002 Record the exact deployed environment assumptions, test account policy, and cleanup rules for live validation

- [ ] V003 Create and verify at least one webhook integration delivery against a controlled endpoint
- [ ] V004 Create and verify at least one chat or incident integration delivery (`slack`, `discord`, `pagerduty`, or `teams`) where credentials are available
- [ ] V005 Validate one negative-path integration delivery and confirm failure status plus audit trail
- [ ] V006 Confirm plan-limit enforcement across all integration creation routes during live validation

- [ ] V007 Trigger a controlled anomaly condition against a safe test resource
- [ ] V008 Confirm snapshot persistence, queue enqueue, queue consumer execution, and anomaly row creation for that condition
- [ ] V009 Confirm alert dispatch was attempted for the anomaly and deduplication did not suppress the first valid alert

- [ ] V010 Validate mitigation dry-run behavior on a non-critical resource
- [ ] V011 Validate one safe confirmed mitigation action on a non-critical resource
- [ ] V012 Confirm mitigation audit records, execution metadata, and rollback or expiry behavior where applicable

- [ ] V013 Observe the `*/5 * * * *` polling cron over at least one normal cycle and record the resulting writes
- [ ] V014 Observe baseline, digest, or housekeeping cron behavior over at least one expected cycle and record outcomes
- [ ] V015 Confirm no repeating runtime errors appear in Worker tail logs during the cron observation window

- [ ] V016 Write the final deployed-validation close-out summary with passed, failed, blocked, and untested items

## Exit Criteria

- [ ] deployed validation evidence doc exists and is current
- [ ] notifications/integrations live checks are documented
- [ ] anomaly and queue path is documented
- [ ] mitigation safety checks are documented
- [ ] cron observation is documented
- [ ] final close-out summary exists
