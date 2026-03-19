# Deployment

FlareLens is designed for seamless deployment to Cloudflare's edge network. This document provides detailed instructions for a production deployment.

## Before You Deploy

Ensure you have completed the following:

- [x] Set up a Cloudflare account.
- [x] Installed `wrangler` CLI.
- [x] Created your D1 database, KV namespaces, and Queues as described in [Getting Started](./getting-started.md).

## Configuration Files

FlareLens uses `wrangler.jsonc` files in `apps/api/` and `apps/web/` to manage deployment settings.

### apps/api/wrangler.jsonc

Update the following:

- `name`: Your backend worker name.
- `compatibility_date`: The latest date recommended by Cloudflare.
- `database_id`: The ID of your D1 database.
- `kv_namespaces`: The IDs of your SESSIONS and CACHE namespaces.
- `queues`: The names of your alert-dispatch and anomaly-check queues.
- `durable_objects`: The name of your LIVE_FEED namespace.

### apps/web/wrangler.jsonc

Update the following:

- `name`: Your frontend worker name.
- `compatibility_date`: The same date used in the backend.
- `database_id`: The ID of your D1 database.
- `kv_namespaces`: The IDs of your SESSIONS and CACHE namespaces.

## Production Deployment Steps

1. **Apply D1 Migrations to Production:**

   ```bash
   cd packages/db
   pnpm wrangler d1 migrations apply DB --remote
   ```

2. **Set Production Secrets:**

   Refer to the [Configuration](./configuration.md) document to set all necessary secrets in Cloudflare for the backend.

3. **Deploy the Backend Worker:**

   ```bash
   cd apps/api
   pnpm deploy
   ```

4. **Deploy the Frontend Application:**

   ```bash
   cd apps/web
   pnpm deploy
   ```

## Custom Domains

Once deployed, you can configure custom domains for your frontend and backend in the Cloudflare dashboard. Ensure you update the `WEB_URL` and `API_URL` environment variables accordingly.
