import type { SessionContext } from '@flarelens/shared';
import { UnauthorizedError } from '@flarelens/shared';
import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { validateSession } from '../auth/session.js';
import type { Env } from '../env.js';

export type AppContext = {
	Bindings: Env;
	Variables: {
		session: SessionContext;
		validatedBody: unknown;
	};
};

export const authMiddleware: MiddlewareHandler<AppContext> = async (c, next) => {
	const token = getCookie(c, '__session');
	if (!token) throw new UnauthorizedError();

	const session = await validateSession(c.env.SESSIONS, token);
	if (!session) throw new UnauthorizedError('Session expired or invalid');

	c.set('session', session);
	await next();
};
