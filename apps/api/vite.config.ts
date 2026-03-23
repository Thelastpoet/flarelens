import { cloudflare } from '@cloudflare/vite-plugin';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [cloudflare({ configPath: 'wrangler.local.jsonc' })],
	server: {
		port: 5174, // hooks.server.ts proxies /api/* here in dev
	},
});
