# Server Route Adapters

`apps/web/src/lib/server/` is the backend-facing boundary for authenticated route loading.

Rules:
- Route data fetching for app pages belongs in `+page.server.ts` and `+layout.server.ts`.
- Adapter modules fetch backend endpoints, assert the exact response contract, and map those responses into route view models.
- Page components render only route view models; they do not interpret raw backend payloads.
- Do not add compatibility fallbacks or silent degradation here. If the backend contract is wrong, throw and fix the contract.

Pattern:
1. `+page.server.ts` calls a single adapter function.
2. The adapter uses `fetchJson()` for backend requests.
3. The adapter validates every field it depends on with `assert.ts`.
4. The adapter returns a stable page-specific view model consumed by the Svelte page.
