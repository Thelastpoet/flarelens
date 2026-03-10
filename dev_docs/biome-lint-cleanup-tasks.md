# Tasks: Biome Lint Cleanup

## Purpose

This file tracks the standalone cleanup required to make `pnpm lint` pass after backend remediation completion.

## Status Rules

- Mark tasks complete only after the command outcome has been rechecked.
- Keep behavior changes out unless lint cleanup exposes a real bug.

## Tasks

- [x] L001 Capture the current `pnpm lint` failure set and group it by category and path
- [x] L002 Run safe import-order and formatting fixes across `apps/api/src/`, `apps/api/test/`, and `packages/shared/src/`
- [x] L003 Remove unused imports and unused private members reported by Biome
- [x] L004 Fix small correctness/style diagnostics such as literal-key simplifications where they do not change runtime behavior
- [x] L005 Re-run `pnpm lint` and iterate until it passes
- [x] L006 Re-run `pnpm check` after lint cleanup
- [x] L007 Re-run `pnpm test` after lint cleanup
- [x] L008 Record final verification outcomes in `dev_docs/biome-lint-cleanup-plan.md`

## Exit Criteria

- [x] `pnpm lint` passes
- [x] `pnpm check` passes
- [x] `pnpm test` passes
