# Repository Guidelines

## Project Structure & Module Organization

This repository is a `pnpm` monorepo for FlareLens. Core applications live in `apps/`: `apps/api` is a Hono-based Cloudflare Worker API, and `apps/web` is a SvelteKit frontend deployed to Workers. Shared code lives in `packages/`: `packages/shared` contains shared types, constants, IDs, errors, and Zod schemas, while `packages/db` contains the D1 schema and repository layer. Product and architecture notes live in `dev_docs/`.

## Build, Test, and Development Commands

Run commands from the repo root unless a package-specific script is needed.

- `pnpm install`: install workspace dependencies.
- `pnpm dev`: run web and API apps in parallel for local development.
- `pnpm build`: build all workspaces.
- `pnpm check`: run TypeScript and Svelte checks across packages.
- `pnpm lint`: run Biome checks for formatting and linting.
- `pnpm format`: apply Biome formatting.
- `pnpm test`: run workspace test scripts, if present.
- `pnpm --filter api cf-typegen` or `pnpm --filter web cf-typegen`: regenerate Cloudflare binding types after Wrangler config changes.

## Coding Style & Naming Conventions

Use TypeScript throughout. Follow the existing style: tabs for indentation, single quotes, semicolons, and ES module imports. Prefer descriptive file names by feature, such as `routes/anomalies.ts` or `services/detection/velocity.ts`. Svelte components use PascalCase file names like `TopEndpoints.svelte`; route files follow SvelteKit conventions such as `+page.ts` and `+page.svelte`. Use Biome as the source of truth before submitting changes.

## Testing Guidelines

Vitest is configured in the API package, but there are currently no committed test files. Add tests alongside the code they cover using `*.test.ts` or `*.spec.ts`. Prioritize repository logic, detection services, and route behavior. Before opening a PR, run `pnpm check`, `pnpm lint`, and any relevant package tests.

## Commit & Pull Request Guidelines

Recent history favors short, imperative commit subjects such as `Add SvelteKit frontend to monorepo` and `Configure wrangler for production deployment and local dev`. Keep commits focused and descriptive. PRs should include a concise summary, linked issue or task when applicable, notes about config or migration changes, and screenshots for UI changes in `apps/web`.

## Security & Configuration Tips

Do not commit secrets. Cloudflare bindings and secrets are defined through Wrangler, and sensitive values such as `TOKEN_ENCRYPTION_KEY`, session secrets, and API keys must stay in local or deployed Worker configuration. When changing D1 schema or token handling, update both migration files and the repositories that depend on them.

## No Fallback Compatibility

Do **not** add or keep fallback code to avoid breaking changes or preserve existing workflows unless the user explicitly asks for it.

Assume the user will migrate existing data, update callers, or fix workflows themselves. Write code that expects the new shape.

### Example: New Required Field

Adding a new required field `type` to a model:

```typescript
// ❌ BAD: Fallback for missing 'type'
function process(item: Item) {
  const type = item.type ?? "legacy"; // Don't do this
  // ...
}

// ✅ GOOD: Assume 'type' exists
function process(item: Item) {
  const type = item.type; // Item.type is required
  // ...
}
```

Do not add `?? "default"`, `if (!item.type)`, or similar logic to handle missing `type`. Assume existing items will be updated to include `type` unless the user says otherwise.

### When to Add Fallbacks

Only add backward-compatibility fallbacks when the user explicitly requests them (e.g. "keep it working for items without type" or "support both old and new format during migration").

## Compatibility Policy

This repository currently follows a hard-break policy.
Agents (including Codex) must not introduce compatibility fallbacks unless explicitly requested by the user.
