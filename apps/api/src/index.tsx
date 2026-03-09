import { createApp } from './app.js';
import type { Env } from './env.js';
import { analyticsRoutes } from './routes/analytics.js';
import { anomaliesRoutes } from './routes/anomalies.js';
import { authRoutes } from './routes/auth.js';
import { cfTokensRoutes } from './routes/cf-tokens.js';
import { notificationsRoutes } from './routes/notifications.js';
import { resourcesRoutes } from './routes/resources.js';
import { handleAlertDispatch } from './queues/alert-dispatch.js';

const app = createApp();

// Public routes
app.route('/auth', authRoutes);

// Protected routes (auth enforced inside each router)
app.route('/cf-tokens', cfTokensRoutes);
app.route('/resources', resourcesRoutes);
app.route('/analytics', analyticsRoutes);
app.route('/anomalies', anomaliesRoutes);
app.route('/notifications', notificationsRoutes);

export default {
	fetch: app.fetch,

	async queue(batch: MessageBatch, env: Env, ctx: ExecutionContext): Promise<void> {
		if (batch.queue === 'flarelens-alert-dispatch') {
			ctx.waitUntil(handleAlertDispatch(batch, env));
		}
	},

	async scheduled(event: ScheduledEvent, _env: Env, _ctx: ExecutionContext): Promise<void> {
		console.log(`[Cron] Triggered: ${event.cron}`);
	},
} satisfies ExportedHandler<Env>;

export { AccountLiveFeed } from './durable-objects/live-feed.js';
