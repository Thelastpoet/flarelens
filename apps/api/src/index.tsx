import { createApp } from './app.js';
import { runBaselineRecalc } from './crons/baseline-recalc.js';
import { runDailyDigest } from './crons/daily-digest.js';
import { runHousekeeping } from './crons/housekeeping.js';
import { runMetricsPoll } from './crons/metrics-poll.js';
import { runResourceSync } from './crons/resource-sync.js';
import type { Env } from './env.js';
import { handleAlertDispatch } from './queues/alert-dispatch.js';
import { handleAnomalyCheck } from './queues/anomaly-check.js';
import { analyticsRoutes } from './routes/analytics.js';
import { anomaliesRoutes } from './routes/anomalies.js';
import { auditLogsRoutes } from './routes/audit-logs.js';
import { authRoutes } from './routes/auth.js';
import { billingRoutes } from './routes/billing.js';
import { cfTokensRoutes } from './routes/cf-tokens.js';
import { developerRoutes } from './routes/developer.js';
import { integrationsRoutes } from './routes/integrations.js';
import { mitigationsRoutes } from './routes/mitigations.js';
import { notificationsRoutes } from './routes/notifications.js';
import { resourcesRoutes } from './routes/resources.js';
import { rulesRoutes } from './routes/rules.js';
import { settingsRoutes } from './routes/settings.js';
import { teamRoutes } from './routes/team.js';
import { wsRoutes } from './routes/ws.js';

const app = createApp();

// Public routes
app.route('/auth', authRoutes);

// Protected routes (auth enforced inside each router)
app.route('/cf-tokens', cfTokensRoutes);
app.route('/resources', resourcesRoutes);
app.route('/analytics', analyticsRoutes);
app.route('/anomalies', anomaliesRoutes);
app.route('/notifications', notificationsRoutes);
app.route('/rules', rulesRoutes);
app.route('/team', teamRoutes);
app.route('/integrations', integrationsRoutes);
app.route('/billing', billingRoutes);
app.route('/audit-logs', auditLogsRoutes);
app.route('/developer', developerRoutes);
app.route('/mitigations', mitigationsRoutes);
app.route('/settings', settingsRoutes);
app.route('/ws', wsRoutes);

export default {
	fetch: app.fetch,

	async queue(batch: MessageBatch, env: Env, ctx: ExecutionContext): Promise<void> {
		if (batch.queue === 'flarelens-alert-dispatch') {
			ctx.waitUntil(handleAlertDispatch(batch, env));
		} else if (batch.queue === 'flarelens-anomaly-check') {
			ctx.waitUntil(handleAnomalyCheck(batch, env));
		}
	},

	async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
		console.log(`[Cron] Triggered: ${controller.cron}`);
		switch (controller.cron) {
			case '*/5 * * * *':
				ctx.waitUntil(runMetricsPoll(env));
				break;
			case '0 */6 * * *':
				ctx.waitUntil(runBaselineRecalc(env));
				break;
			case '0 8 * * *':
				ctx.waitUntil(runDailyDigest(env));
				break;
			case '0 */12 * * *':
				ctx.waitUntil(runResourceSync(env));
				break;
			case '0 3 * * *':
				ctx.waitUntil(runHousekeeping(env));
				break;
			default:
				console.warn(`[Cron] Unknown cron expression: ${controller.cron}`);
		}
	},
} satisfies ExportedHandler<Env>;

export { AccountLiveFeed } from './durable-objects/live-feed.js';
