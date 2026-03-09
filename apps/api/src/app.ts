import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { requestId } from 'hono/request-id';
import { secureHeaders } from 'hono/secure-headers';
import type { AppContext } from './middleware/auth.js';
import { createCorsMiddleware } from './middleware/cors.js';
import { errorHandler } from './middleware/error-handler.js';

export function createApp() {
	const app = new Hono<AppContext>();

	// Global middleware
	app.use('*', requestId());
	app.use('*', logger());
	app.use('*', secureHeaders());
	app.use('*', createCorsMiddleware());

	// Global error handler
	app.onError(errorHandler);

	// Health check
	app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

	return app;
}

export type App = ReturnType<typeof createApp>;
