import { createApp } from '../../src/app.js';
import { authRoutes } from '../../src/routes/auth.js';
import { anomaliesRoutes } from '../../src/routes/anomalies.js';
import { auditLogsRoutes } from '../../src/routes/audit-logs.js';
import { billingRoutes } from '../../src/routes/billing.js';
import { cfTokensRoutes } from '../../src/routes/cf-tokens.js';
import { mitigationsRoutes } from '../../src/routes/mitigations.js';
import { notificationsRoutes } from '../../src/routes/notifications.js';
import { settingsRoutes } from '../../src/routes/settings.js';
import { teamRoutes } from '../../src/routes/team.js';

export function createTestApp() {
	const app = createApp();
	app.route('/auth', authRoutes);
	app.route('/anomalies', anomaliesRoutes);
	app.route('/audit-logs', auditLogsRoutes);
	app.route('/cf-tokens', cfTokensRoutes);
	app.route('/billing', billingRoutes);
	app.route('/mitigations', mitigationsRoutes);
	app.route('/notifications', notificationsRoutes);
	app.route('/settings', settingsRoutes);
	app.route('/team', teamRoutes);
	return app;
}
