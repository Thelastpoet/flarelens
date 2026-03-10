# Frontend Quality Audit

## Purpose

This note records the first-pass frontend quality review that should run in parallel with backend wiring.

The goal is not to redesign the UI. The goal is to preserve the intended visual design while fixing implementation, accessibility, and maintainability issues that would make the shipped UI weaker than it looks in screenshots.

## Initial Findings

### 1. Shared Shell Still Uses Mock Identity Data

- `apps/web/src/lib/components/layout/Sidebar.svelte`
- `apps/web/src/routes/(app)/settings/+page.svelte`

These surfaces still import `currentUser` or `account` from `lib/data/mock.ts`. This is both a data-integration issue and a quality issue because the shared shell is lying about runtime identity.

### 2. Live Pages Still Contain Hardcoded Visual Fallback Content

- `apps/web/src/routes/(app)/dashboard/+page.svelte`
- `apps/web/src/routes/(app)/analytics/+page.svelte`

These pages already have real loaders, but they still include hardcoded trend badges, static recent-activity items, or demo-only visual fallback sections. That creates a mismatch between real data and screen semantics.

### 3. Many Interactive Controls Use Local-Only UI Logic

Examples found in:

- `apps/web/src/routes/(app)/rules/+page.svelte`
- `apps/web/src/routes/(app)/anomalies/+page.svelte`
- `apps/web/src/routes/(app)/developer/+page.svelte`
- `apps/web/src/lib/components/layout/AppShell.svelte`
- `apps/web/src/lib/components/layout/TopBar.svelte`

This does not automatically mean the code is wrong, but it means many controls are still presentation-only and need careful review during wiring so they do not become fake interactions in production.

### 4. Accessibility Review Is Needed for Custom UI Patterns

The UI uses many custom buttons, modal backdrops, tab buttons, switch-like controls, and dropdown-like buttons. Several are likely fine, but they need deliberate review for:

- keyboard behavior
- focus visibility
- semantic roles and labels
- state announcement (`aria-pressed`, `aria-selected`, `aria-expanded`, `aria-checked`)
- dialog/backdrop escape and focus trapping

The scan found many direct `onclick` handlers and custom controls, which is where these issues usually hide.

### 5. Svelte Compile Health Is Currently Clean

- `pnpm --filter web check`
- Result: passed with `0 errors` and `0 warnings`

That is useful, but it does not replace a UX/accessibility audit.

## Conclusion

The frontend work should proceed as two parallel tracks:

1. backend data integration
2. frontend quality and accessibility hardening

Neither should block the other completely, but shared-shell fixes and loader-backed pages should be cleaned as they are wired so the code does not need a second pass for the same surface.
