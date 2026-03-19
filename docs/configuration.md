# Configuration

FlareLens uses environment variables for configuration. This document explains each variable and how to set them.

## Backend (apps/api)

These variables should be set in a `.dev.vars` file for local development or as Cloudflare Workers secrets for production.

### Required Variables

- `ENVIRONMENT`: Set to `development` for local work or `production` for deployments.
- `WEB_URL`: The full URL where the frontend is hosted (e.g., `http://localhost:5173` or `https://flarelens.pages.dev`).
- `API_URL`: The full URL where the backend is hosted (e.g., `http://localhost:8787` or `https://api.flarelens.pages.dev`).
- `TOKEN_ENCRYPTION_KEY`: A 64-character hex string used for encrypting Cloudflare API tokens. You can generate one with `openssl rand -hex 32`.

### Optional Variables

- `RESEND_API_KEY`: Your Resend API key for sending email alerts.
- `GOOGLE_CLIENT_ID`: The client ID for Google OAuth.
- `GOOGLE_CLIENT_SECRET`: The client secret for Google OAuth.
- `GITHUB_CLIENT_ID`: The client ID for GitHub OAuth.
- `GITHUB_CLIENT_SECRET`: The client secret for GitHub OAuth.

## Frontend (apps/web)

The frontend is a SvelteKit application. Most configuration is handled by the backend, but there are a few environment variables that can be set.

### Required Variables

- `VITE_API_URL`: The URL for the backend API (defaults to `/api` if not set, as it is proxied by SvelteKit).

## Setting Secrets in Cloudflare

To set a secret in production, use the `wrangler secret put` command:

```bash
cd apps/api
wrangler secret put TOKEN_ENCRYPTION_KEY
# Enter the hex string when prompted
```

Repeat this for all required secrets.
