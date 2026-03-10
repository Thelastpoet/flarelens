```txt
npm install
npm run dev
```

```txt
npm run deploy
```

Operational notes:

- `TOKEN_ENCRYPTION_KEY` must be a 64-character hex string for AES-256-GCM token encryption.
- Request throttling in `src/middleware/rate-limit.ts` is KV-backed and best-effort, not a strict distributed limiter.

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiation `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```
