import { createApp } from '../../src/app.js';
import { authRoutes } from '../../src/routes/auth.js';
import { billingRoutes } from '../../src/routes/billing.js';
import { cfTokensRoutes } from '../../src/routes/cf-tokens.js';
import { mitigationsRoutes } from '../../src/routes/mitigations.js';

export function createTestApp() {
	const app = createApp();
	app.route('/auth', authRoutes);
	app.route('/cf-tokens', cfTokensRoutes);
	app.route('/billing', billingRoutes);
	app.route('/mitigations', mitigationsRoutes);
	return app;
}
