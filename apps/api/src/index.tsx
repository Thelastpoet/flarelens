import { createApp } from './app.js';
import type { Env } from './env.js';
import { analyticsRoutes } from './routes/analytics.js';
import { authRoutes } from './routes/auth.js';
import { cfTokensRoutes } from './routes/cf-tokens.js';
import { resourcesRoutes } from './routes/resources.js';

const app = createApp();

// Public routes
app.route('/auth', authRoutes);

// Protected routes (auth enforced inside each router)
app.route('/cf-tokens', cfTokensRoutes);
app.route('/resources', resourcesRoutes);
app.route('/analytics', analyticsRoutes);

export default {
	fetch: app.fetch,

	async queue(batch: MessageBatch, _env: Env): Promise<void> {
		console.log(`[Queue] Received batch from ${batch.queue}, ${batch.messages.length} messages`);
	},

	async scheduled(event: ScheduledEvent, _env: Env, _ctx: ExecutionContext): Promise<void> {
		console.log(`[Cron] Triggered: ${event.cron}`);
	},
} satisfies ExportedHandler<Env>;

export { AccountLiveFeed } from './durable-objects/live-feed.js';
