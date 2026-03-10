# Frontend Production Audit

## Purpose

This directory replaces ad hoc frontend patching with a production-grade audit of `apps/web`.

The goal is to document why the current frontend is unstable under real backend data and to define the architecture changes needed before more wiring work continues.

This audit is written for a multi-tenant SaaS environment. The standard is not "works in mock mode" or "renders on one account." The standard is:

- stable route rendering
- predictable server/client separation
- explicit backend-to-frontend contracts
- safe behavior under partial, slow, or evolving data

## Documents

- `frontend-production-audit.md`
  - root findings, systemic problems, and production risks
- `route-failure-matrix.md`
  - route-by-route classification of current loading/failure behavior
- `frontend-remediation-architecture-plan.md`
  - target structure and execution order for fixing the frontend correctly
- `frontend-anti-pattern-inventory.md`
  - concrete architecture/code anti-patterns observed in the current frontend
- `frontend-production-remediation-tasks.md`
  - tracked execution tasks to move from current state to production-safe architecture
- `frontend-route-smoke-checklist.md`
  - release smoke checklist and route-level deploy gate for authenticated flows

## Core Conclusion

The current frontend is not failing because of one broken page. It is failing because the integration boundary between backend data, route loading, and UI rendering is inconsistent.

Until that boundary is corrected, fixing individual pages will continue to expose new failures.
