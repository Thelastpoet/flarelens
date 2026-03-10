# FlareLens

FlareLens is a Cloudflare budget guard for teams that want to catch abnormal usage before it turns into an operational issue or an expensive surprise.

It connects to Cloudflare, monitors traffic and usage signals, detects unusual spikes, attributes likely causes, and alerts teams early enough to respond before bills escalate.

## What FlareLens Does

- monitors Cloudflare-backed traffic and usage patterns
- detects anomalous spikes that may indicate abuse, misconfiguration, or unexpected demand
- attributes likely contributors behind those spikes
- delivers alerts through channels teams already use
- supports controlled response workflows when intervention is needed

## Use Cases

- catch sudden Cloudflare traffic spikes before costs escalate
- identify unusual request behavior that may drive unexpected usage
- give teams early warning when Cloudflare activity changes sharply
- route anomaly alerts into existing operational workflows

## Repository Overview

This repository contains the FlareLens application:

- `apps/web` — the user-facing application
- `apps/api` — the backend API
- `packages/shared` — shared types and schemas
- `packages/db` — database schema and data access layer
- `dev_docs` — product and engineering documentation

## Development

Install dependencies and run the workspace:

```bash
pnpm install
pnpm dev
```

Common commands:

```bash
pnpm build
pnpm check
pnpm lint
pnpm test
```

## Deployment

Deploy the application workers from their app directories:

```bash
cd apps/api && pnpm deploy
cd apps/web && pnpm deploy
```
