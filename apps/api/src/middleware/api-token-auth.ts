import type { SessionContext } from '@flarelens/shared';
import { UnauthorizedError } from '@flarelens/shared';
import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { DeveloperTokensRepository } from '@flarelens/db';
import { validateSession } from '../auth/session.js';
import type { AppContext } from './auth.js';

async function hashToken(token: string): Promise<string> {
	const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
	return Array.from(new Uint8Array(buf))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

/**
 * Auth middleware that accepts EITHER a session cookie OR a Bearer API token.
 * Attaches the same SessionContext regardless of auth method.
 */
export const apiTokenAuthMiddleware: MiddlewareHandler<AppContext> = async (c, next) => {
	const authHeader = c.req.header('Authorization');

	// --- Bearer token path ---
	if (authHeader?.startsWith('Bearer ')) {
		const rawToken = authHeader.slice(7).trim();
		const hash = await hashToken(rawToken);

		const DB = (c.env as unknown as { DB: D1Database }).DB;
		// Use a temporary repo (account_id not yet known)
		const devTokens = new DeveloperTokensRepository(DB, '');
		const record = await devTokens.findByHash(hash);

		if (!record) throw new UnauthorizedError('Invalid or revoked API token');

		if (record.expires_at && new Date(record.expires_at) < new Date()) {
			throw new UnauthorizedError('API token has expired');
		}

		// Mark as used (fire-and-forget)
		devTokens.markUsed(record.id).catch(() => {});

		const session: SessionContext = {
			user_id: record.user_id,
			account_id: record.account_id,
			role: 'admin', // developer tokens carry full account access
			session_id: `token:${record.id}`,
		};

		c.set('session', session);
		await next();
		return;
	}

	// --- Session cookie path ---
	const token = getCookie(c, '__session');
	if (!token) throw new UnauthorizedError();

	const session = await validateSession(c.env.SESSIONS, token);
	if (!session) throw new UnauthorizedError('Session expired or invalid');

	c.set('session', session);
	await next();
};
