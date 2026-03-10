import { createApp } from '../../src/app.js';
import { authRoutes } from '../../src/routes/auth.js';
import { cfTokensRoutes } from '../../src/routes/cf-tokens.js';

export function createTestApp() {
	const app = createApp();
	app.route('/auth', authRoutes);
	app.route('/cf-tokens', cfTokensRoutes);
	return app;
}
