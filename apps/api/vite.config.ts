import { cloudflare } from '@cloudflare/vite-plugin';
import { defineConfig } from 'vite';
import ssrPlugin from 'vite-ssr-components/plugin';

export default defineConfig({
	plugins: [cloudflare(), ssrPlugin()],
	server: {
		port: 5174, // hooks.server.ts proxies /api/* here in dev
	},
});
