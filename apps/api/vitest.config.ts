import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['test/contract/**/*.ts', 'test/integration/**/*.ts', 'test/unit/**/*.ts'],
		environment: 'node',
	},
});
