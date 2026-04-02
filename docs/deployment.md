# Deployment

FlareLens deploys to Cloudflare Workers as two services:

- `flarelens-api` for the backend API
- `flarelens-web` for the SvelteKit frontend

This document describes the production deployment workflow contributors should follow.

## Before You Deploy

Ensure you have completed the following:

- [x] Set up a Cloudflare account.
- [x] Installed dependencies with `pnpm install`.
- [x] Created your D1 database, KV namespaces, and Queues as described in [Getting Started](./getting-started.md).
- [x] Logged into Wrangler with `pnpm --filter api exec wrangler whoami`.

## Configuration Files

FlareLens uses local, gitignored Wrangler config files for real deployments:

- `apps/api/wrangler.local.jsonc`
- `apps/web/wrangler.local.jsonc`

The committed `wrangler.example.jsonc` files are templates for contributors. Copy them to `wrangler.local.jsonc` and fill in your own Cloudflare resources.

### API worker config

`apps/api/wrangler.local.jsonc` should define:

- `name`: `flarelens-api`
- `account_id`: your Cloudflare account ID
- `d1_databases[0]`: the production D1 database binding
- `kv_namespaces`: `SESSIONS` and `CACHE`
- `queues`: `flarelens-alert-dispatch` and `flarelens-anomaly-check`
- `durable_objects`: `LIVE_FEED`
- `vars.WEB_URL`: your deployed web URL
- `vars.API_URL`: your deployed API URL

### Web worker config

`apps/web/wrangler.local.jsonc` should define:

- `name`: `flarelens-web`
- `account_id`: your Cloudflare account ID
- `services[0].service`: `flarelens-api`
- `kv_namespaces`: `SESSIONS`
- `vars.API_URL`: your deployed API URL

## Production Deployment Steps

1. **Create or update your local Wrangler configs:**

   ```bash
   cp apps/api/wrangler.example.jsonc apps/api/wrangler.local.jsonc
   cp apps/web/wrangler.example.jsonc apps/web/wrangler.local.jsonc
   ```

   Update both local files with your account ID, D1/KV/Queue IDs, and final deployment URLs.

2. **Set backend production secrets:**

   Set required backend secrets from [Configuration](./configuration.md).

   ```bash
   cd apps/api
   pnpm exec wrangler secret put TOKEN_ENCRYPTION_KEY --config wrangler.local.jsonc
   ```

   Repeat `wrangler secret put` for any additional secrets you use.

3. **Apply D1 migrations to production:**

   Run migrations against the API worker's `DB` binding so Wrangler uses the same Cloudflare account and database configuration as the deployed Worker.

   ```bash
   cd apps/api
   pnpm exec wrangler d1 migrations apply DB --remote --config wrangler.local.jsonc
   ```

4. **Deploy the API worker first:**

   The frontend depends on the API worker through a Cloudflare service binding, so the API worker must be deployed before the web worker.

   ```bash
   cd apps/api
   pnpm run deploy
   ```

5. **Deploy the web worker:**

   ```bash
   cd apps/web
   pnpm run deploy
   ```

6. **Verify the deployed Workers:**

   ```bash
   cd apps/api
   pnpm exec wrangler deployments list --name flarelens-api --config wrangler.local.jsonc
   cd ../web
   pnpm exec wrangler deployments list --name flarelens-web --config wrangler.local.jsonc
   ```

   If you use the default Workers.dev subdomains, the deployed URLs are typically:

   - `https://flarelens-api.<your-subdomain>.workers.dev`
   - `https://flarelens-web.<your-subdomain>.workers.dev`

## Custom Domains

If you later attach custom domains in the Cloudflare dashboard, update:

- `apps/api/wrangler.local.jsonc` `vars.WEB_URL`
- `apps/api/wrangler.local.jsonc` `vars.API_URL`
- `apps/web/wrangler.local.jsonc` `vars.API_URL`

Then redeploy both Workers.
