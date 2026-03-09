import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { UnauthorizedError } from '@flarelens/shared';
import type { AppContext } from '../middleware/auth.js';
import { validateSession } from '../auth/session.js';
import type { Env } from '../env.js';

const ws = new Hono<AppContext>();

// GET /ws — upgrade to WebSocket via AccountLiveFeed Durable Object
ws.get('/', async (c) => {
	const upgradeHeader = c.req.header('Upgrade');
	if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
		return c.text('Expected WebSocket upgrade', 426);
	}

	// Authenticate session
	const token = getCookie(c, '__session');
	if (!token) throw new UnauthorizedError();

	const session = await validateSession(c.env.SESSIONS, token);
	if (!session) throw new UnauthorizedError('Session expired');

	// Get Durable Object stub keyed by account_id
	const env = c.env as Env & { LIVE_FEED: DurableObjectNamespace };
	const id = env.LIVE_FEED.idFromName(session.account_id);
	const stub = env.LIVE_FEED.get(id);

	// Forward the WebSocket upgrade request to the DO
	const doUrl = new URL(c.req.url);
	doUrl.pathname = '/ws';
	const req = new Request(doUrl.toString(), c.req.raw);
	return stub.fetch(req);
});

export { ws as wsRoutes };
