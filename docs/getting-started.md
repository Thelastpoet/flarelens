# Getting Started

Follow these steps to set up FlareLens for local development or production.

## Prerequisites

Before you begin, ensure you have the following:

- **Node.js:** (v18 or later recommended)
- **pnpm:** (v8 or later)
- **Cloudflare Account:** For deploying the application.
- **Wrangler:** The Cloudflare Workers CLI (installed via `pnpm install`).
- **Resend Account (Optional):** If you want to enable email alerts.

## Local Development

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/flarelens/flarelens.git
   cd flarelens
   ```

2. **Install Dependencies:**

   ```bash
   pnpm install
   ```

3. **Create local Wrangler configs:**

   ```bash
   cp apps/api/wrangler.example.jsonc apps/api/wrangler.local.jsonc
   cp apps/web/wrangler.example.jsonc apps/web/wrangler.local.jsonc
   ```

   Replace every `__YOUR_*__` placeholder with your Cloudflare account resources.

4. **Set Up Your Environment:**

   Create a `.dev.vars` file in `apps/api/` with the following variables:

   ```bash
   ENVIRONMENT=development
   WEB_URL=http://localhost:5173
   API_URL=http://localhost:8787
   TOKEN_ENCRYPTION_KEY=64-character-hex-string
   RESEND_API_KEY=re_123456789
   ```

5. **Initialize the Database:**

   ```bash
   cd apps/api
   pnpm exec wrangler d1 migrations apply DB --local --config wrangler.local.jsonc
   ```

6. **Start the Development Servers:**

   From the root directory:

   ```bash
   pnpm dev
   ```

   This will start the frontend (usually on port 5173) and the backend (usually on port 8787).

## Cloudflare Setup

To deploy FlareLens to your own Cloudflare account, follow these steps:

1. **Create the D1 Database:**

   ```bash
   pnpm --filter api exec wrangler d1 create flarelens-db
   ```

   Update the `database_id` in `apps/api/wrangler.local.jsonc`.

2. **Create the KV Namespaces:**

   ```bash
   pnpm --filter api exec wrangler kv namespace create SESSIONS
   pnpm --filter api exec wrangler kv namespace create CACHE
   ```

   Update the namespace IDs in `apps/api/wrangler.local.jsonc` and `apps/web/wrangler.local.jsonc`.

3. **Create the Queues:**

   ```bash
   pnpm --filter api exec wrangler queues create flarelens-alert-dispatch
   pnpm --filter api exec wrangler queues create flarelens-anomaly-check
   ```

   Update the queue names in `apps/api/wrangler.local.jsonc` if you choose different names.

4. **Create local Wrangler configs from the committed templates:**

   ```bash
   cp apps/api/wrangler.example.jsonc apps/api/wrangler.local.jsonc
   cp apps/web/wrangler.example.jsonc apps/web/wrangler.local.jsonc
   ```

   Set the Worker names to `flarelens-api` and `flarelens-web`, and make sure `apps/web/wrangler.local.jsonc` uses `flarelens-api` as its service binding target.

5. **Deploy the Backend:**

   ```bash
   cd apps/api
   pnpm run deploy
   ```

6. **Deploy the Frontend:**

   ```bash
   cd apps/web
   pnpm run deploy
   ```

## Next Steps

Once FlareLens is running, you can connect your first Cloudflare account by providing a scoped API token with `Account:Read` and `Analytics:Read` permissions.
