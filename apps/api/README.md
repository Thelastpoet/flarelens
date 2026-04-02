```txt
pnpm install
cp wrangler.example.jsonc wrangler.local.jsonc
pnpm run dev
```

Before running Worker-specific commands, copy `wrangler.example.jsonc` to `wrangler.local.jsonc` and replace every `__YOUR_*__` placeholder with resources from your own Cloudflare account.

`wrangler.local.jsonc` is intentionally ignored by git. The committed source of truth is `wrangler.example.jsonc`, and local deploy commands validate the copied file before running.

Observability is required for the API worker. Keep this in `wrangler.local.jsonc`:

```json
"observability": {
	"enabled": true
}
```

The deploy/check scripts will fail if API observability is missing or disabled.

```txt
pnpm run deploy
```

Operational notes:

- `TOKEN_ENCRYPTION_KEY` must be a 64-character hex string for AES-256-GCM token encryption.
- `wrangler.local.jsonc` is intentionally ignored by git. Keep account IDs, D1 IDs, KV namespace IDs, and deploy URLs in that local file only.
- Do not remove `observability.enabled` from the API Wrangler config. Production debugging depends on Workers telemetry being present from the initial deploy.
- Request throttling in `src/middleware/rate-limit.ts` is KV-backed and best-effort, not a strict distributed limiter.

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
pnpm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiation `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```
