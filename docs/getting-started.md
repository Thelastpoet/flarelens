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

3. **Set Up Your Environment:**

   Create a `.dev.vars` file in `apps/api/` with the following variables:

   ```bash
   ENVIRONMENT=development
   WEB_URL=http://localhost:5173
   API_URL=http://localhost:8787
   TOKEN_ENCRYPTION_KEY=64-character-hex-string
   RESEND_API_KEY=re_123456789
   ```

4. **Initialize the Database:**

   ```bash
   cd packages/db
   pnpm wrangler d1 migrations apply DB --local
   ```

5. **Start the Development Servers:**

   From the root directory:

   ```bash
   pnpm dev
   ```

   This will start the frontend (usually on port 5173) and the backend (usually on port 8787).

## Cloudflare Setup

To deploy FlareLens to your own Cloudflare account, follow these steps:

1. **Create the D1 Database:**

   ```bash
   npx wrangler d1 create flarelens-db
   ```

   Update the `database_id` in `apps/api/wrangler.jsonc` and `apps/web/wrangler.jsonc`.

2. **Create the KV Namespaces:**

   ```bash
   npx wrangler kv:namespace create SESSIONS
   npx wrangler kv:namespace create CACHE
   ```

   Update the `id` for each namespace in `apps/api/wrangler.jsonc` and `apps/web/wrangler.jsonc`.

3. **Create the Queues:**

   ```bash
   npx wrangler queues create alert-dispatch-queue
   npx wrangler queues create anomaly-check-queue
   ```

   Update the `queue` names in `apps/api/wrangler.jsonc`.

4. **Deploy the Backend:**

   ```bash
   cd apps/api
   pnpm deploy
   ```

5. **Deploy the Frontend:**

   ```bash
   cd apps/web
   pnpm deploy
   ```

## Next Steps

Once FlareLens is running, you can connect your first Cloudflare account by providing a scoped API token with `Account:Read` and `Analytics:Read` permissions.
