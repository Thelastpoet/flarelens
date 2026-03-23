# FlareLens

FlareLens is an open-source Cloudflare budget guard that helps you catch abnormal usage before it turns into an operational issue or an expensive surprise.

It connects to Cloudflare, monitors traffic and usage signals, detects unusual spikes, attributes likely causes, and delivers alerts early enough to respond before bills escalate.

## Key Features

- **Automated Monitoring:** Monitor Cloudflare-backed traffic and usage patterns.
- **Anomaly Detection:** Detect anomalous spikes that may indicate abuse, misconfiguration, or unexpected demand.
- **Smart Alerting:** Deliver alerts through Slack, Discord, PagerDuty, and email.
- **Root Cause Attribution:** Identify likely contributors behind usage spikes.
- **Response Workflows:** Support controlled response workflows when intervention is needed.

## Documentation

For detailed information on how to use FlareLens, please refer to our documentation:

- **[Introduction](./docs/introduction.md)** — Overview and core mission.
- **[Architecture](./docs/architecture.md)** — Technical details and data flow.
- **[Getting Started](./docs/getting-started.md)** — Prerequisites and local setup.
- **[Configuration](./docs/configuration.md)** — Environment variables and settings.
- **[Deployment](./docs/deployment.md)** — Deploying to Cloudflare.
- **[Contributing](./docs/contributing.md)** — How to help improve FlareLens.

## Quick Start

1. **Install Dependencies:**
   ```bash
   pnpm install
   ```
2. **Create Local Wrangler Configs:** Copy `apps/api/wrangler.example.jsonc` to `apps/api/wrangler.local.jsonc` and `apps/web/wrangler.example.jsonc` to `apps/web/wrangler.local.jsonc`, then replace every `__YOUR_*__` placeholder with resources from your own Cloudflare account.
3. **Set Up Environment:** Create `.dev.vars` in `apps/api/`.
4. **Run Development Mode:**
   ```bash
   pnpm dev
   ```

## Cloudflare Configuration

This repository is open source. Real Cloudflare account IDs, namespace IDs, database IDs, worker URLs, and other deploy-target details must stay out of version control.

- `apps/api/wrangler.example.jsonc` and `apps/web/wrangler.example.jsonc` are committed templates.
- `apps/api/wrangler.local.jsonc` and `apps/web/wrangler.local.jsonc` are ignored local files for your own account.
- Secrets such as `TOKEN_ENCRYPTION_KEY` still belong in Wrangler secrets or `.dev.vars`, not in config files.

## Repository Overview

- `apps/web` — SvelteKit user interface
- `apps/api` — Hono backend API
- `packages/shared` — Shared types and schemas
- `packages/db` — Database access layer and migrations

## License

FlareLens is open-source software licensed under the [MIT License](./LICENSE).
