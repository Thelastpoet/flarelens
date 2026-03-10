import { RATE_LIMITS, RateLimitError } from '@flarelens/shared';
import type { MiddlewareHandler } from 'hono';
import type { AppContext } from './auth.js';

type RateLimitGroup = keyof typeof RATE_LIMITS;

export function rateLimit(group: RateLimitGroup): MiddlewareHandler<AppContext> {
	return async (c, next) => {
		const session = c.get('session');
		const { limit, window_seconds } = RATE_LIMITS[group];
		const key = `rl:${session.account_id}:${group}`;

		const kv = c.env.CACHE;
		const raw = await kv.get(key);
		const current = raw ? parseInt(raw, 10) : 0;

		if (current >= limit) {
			throw new RateLimitError(`Best-effort rate limit exceeded for ${group} operations`);
		}

		// KV-based throttling is eventually consistent, so this is intentionally best-effort.
		if (current === 0) {
			await kv.put(key, '1', { expirationTtl: window_seconds });
		} else {
			// KV does not expose TTL on reads, so updates rewrite the same window length.
			await kv.put(key, String(current + 1), { expirationTtl: window_seconds });
		}

		await next();
	};
}

/** Rate limiter for unauthenticated routes (keyed by IP). */
export function rateLimitByIp(group: RateLimitGroup): MiddlewareHandler {
	return async (c, next) => {
		const ip = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? 'unknown';
		const { limit, window_seconds } = RATE_LIMITS[group];
		const key = `rl:ip:${ip}:${group}`;

		const kv = (c.env as { CACHE: KVNamespace }).CACHE;
		const raw = await kv.get(key);
		const current = raw ? parseInt(raw, 10) : 0;

		if (current >= limit) {
			throw new RateLimitError('Best-effort rate limit exceeded');
		}

		await kv.put(key, String(current + 1), { expirationTtl: window_seconds });
		await next();
	};
}
