# Biome Lint Cleanup Plan

## Purpose

This document tracks the repository-wide Biome backlog discovered after backend remediation close-out.

The goal is to make `pnpm lint` pass without mixing formatting and style cleanup into the completed API remediation phases.

## Current Status

Verification result recorded on March 10, 2026:

- Initial state:
  - `pnpm check`: passed
  - `pnpm test`: passed
  - `pnpm lint`: failed

Observed failure categories:

- import ordering
- formatting drift
- unused private members / unused imports
- literal-key simplifications

The largest concentration is in `apps/api/src/`.

## Cleanup Strategy

1. Apply safe Biome auto-fixes first.
2. Re-run `pnpm lint` and capture remaining diagnostics.
3. Fix semantic leftovers manually:
   - unused imports
   - unused members
   - misleading comments revealed by cleanup
4. Re-run:
   - `pnpm lint`
   - `pnpm check`
   - `pnpm test`
5. Commit the cleanup as a separate repository-hygiene change.

## Scope Notes

- This is a code-quality cleanup stream, not a product/backend-remediation stream.
- Do not change runtime behavior unless a lint failure exposes a real defect.
- Keep commits mechanical and reviewable.

## Primary Targets

- `apps/api/src/`
- `apps/api/test/`
- `packages/shared/src/`

## Exit Criteria

- `pnpm lint` passes
- `pnpm check` still passes
- `pnpm test` still passes
- no remediation tracking docs need to change

## Final Outcome

Completed on March 10, 2026:

- `pnpm lint`: passed
- `pnpm check`: passed
- `pnpm test`: passed

Cleanup types applied:

- Biome import ordering and formatting fixes
- removal of unused imports / members / parameters
- small mechanical style cleanups in API, shared, DB, and affected web files
