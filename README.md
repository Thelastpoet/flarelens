# FlareLens

FlareLens is an open-source Cloudflare budget guard for teams that want to catch abnormal usage before it turns into an operational issue or an expensive surprise.

It connects to Cloudflare, monitors traffic and usage signals, detects unusual spikes, attributes likely causes, and alerts teams early enough to respond before bills escalate.

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
2. **Set Up Environment:** Create `.dev.vars` in `apps/api/`.
3. **Run Development Mode:**
   ```bash
   pnpm dev
   ```

## Repository Overview

- `apps/web` — SvelteKit user interface
- `apps/api` — Hono backend API
- `packages/shared` — Shared types and schemas
- `packages/db` — Database access layer and migrations

## License

FlareLens is open-source software licensed under the [MIT License](./LICENSE).
