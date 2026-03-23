# FlareLens Web

This app is the SvelteKit frontend for FlareLens.

## Local Setup

```sh
pnpm install
cp wrangler.example.jsonc wrangler.local.jsonc
pnpm run dev
```

Before running Worker-specific commands, copy `wrangler.example.jsonc` to `wrangler.local.jsonc` and replace every `__YOUR_*__` placeholder with resources from your own Cloudflare account.

`wrangler.local.jsonc` is intentionally ignored by git so open source contributors do not commit personal Cloudflare account details.

## Build And Deploy

```sh
pnpm run build
pnpm run deploy
```

## Type Generation

```sh
pnpm run cf-typegen
```

The type generation command scrubs URL literals from the generated Worker bindings file before it is left in the repo.
