import type { Role } from '@flarelens/shared';
import { ForbiddenError } from '@flarelens/shared';
import type { MiddlewareHandler } from 'hono';
import type { AppContext } from './auth.js';

export function requireRole(...roles: Role[]): MiddlewareHandler<AppContext> {
	return async (c, next) => {
		const session = c.get('session');
		if (!roles.includes(session.role)) {
			throw new ForbiddenError();
		}
		await next();
	};
}
