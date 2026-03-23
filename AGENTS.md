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

Do not commit secrets. Cloudflare bindings and secrets are defined through Wrangler, and sensitive values such as `TOKEN_ENCRYPTION_KEY`, session secrets, and API keys must stay in local or deployed Worker configuration. This repository is open source, so do not hardcode or commit personal Cloudflare account IDs, namespace IDs, database IDs, or deploy-target URLs in tracked Wrangler config. Keep user-specific Wrangler config in ignored local files such as `apps/api/wrangler.local.jsonc` and `apps/web/wrangler.local.jsonc`, and keep committed config limited to templates like `wrangler.example.jsonc`. When changing D1 schema or token handling, update both migration files and the repositories that depend on them.

## No Fallback Compatibility

Do **not** add or keep fallback code to soften breaking changes, guess around platform errors, or preserve legacy behavior unless the user explicitly asks for it.

Assume this repository should be corrected at the source:
- update the schema instead of tolerating missing fields forever
- fix the Cloudflare query or capability check instead of silently switching to a weaker path
- migrate stored data instead of carrying dual-format parsing
- fail clearly when required configuration, permissions, or resources are missing

Write code that expects the intended contract to be true.

### Examples In This Repository

```typescript
// ❌ BAD: hide a real contract problem with a fallback
const cfAccountId = token.cf_account_id ?? account.id;

// ✅ GOOD: require the verified token shape
const cfAccountId = token.cf_account_id;
if (!cfAccountId) {
  throw new ValidationError('Verified Cloudflare account ID is required');
}
```

```typescript
// ❌ BAD: silently degrade a broken analytics path
const traffic = await get1mTraffic().catch(() => getHourlyTraffic());

// ✅ GOOD: fix the query, permission model, or schedule assumptions
const traffic = await get1mTraffic();
```

Do not add `??` defaults, silent `catch` fallbacks, dual-read logic, or compatibility branches just to keep old code limping along. If the contract is changing, change it directly and update migrations, callers, tests, and docs.

### When Fallbacks Are Allowed

Only add compatibility or graceful-degradation logic when the user explicitly requests it and the intended scope is clear, for example:
- temporary dual-read during a named migration
- optional non-critical UX degradation in the frontend
- explicit support for two external payload versions

If a fallback is requested, document its removal condition in the code or task doc.

## Compatibility Policy

This repository currently follows a hard-break policy.
Agents (including Codex) must not introduce compatibility fallbacks unless explicitly requested by the user.
