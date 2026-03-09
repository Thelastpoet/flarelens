import type { MiddlewareHandler } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from '../env.js';

export function createCorsMiddleware(): MiddlewareHandler<{ Bindings: Env }> {
	return cors({
		origin: (origin, c) => {
			const webUrl = c.env.WEB_URL;
			const allowed = [webUrl, 'http://localhost:5173', 'http://localhost:4173'];
			if (!origin || allowed.includes(origin)) return origin ?? '*';
			return null;
		},
		allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
		allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
		exposeHeaders: ['X-Request-Id'],
		credentials: true,
		maxAge: 86400,
	});
}
