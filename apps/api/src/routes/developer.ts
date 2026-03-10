import { NotFoundError, newId } from '@flarelens/shared';
import { Hono } from 'hono';
import { z } from 'zod';
import { logAudit } from '../middleware/audit.js';
import type { AppContext } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { requireRole } from '../middleware/rbac.js';
import { reposMiddleware } from '../middleware/repos.js';
import { validate } from '../middleware/validate.js';

const TOKEN_PREFIX_LENGTH = 8;

async function hashToken(token: string): Promise<string> {
	const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
	return Array.from(new Uint8Array(buf))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

function generateToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return (
		'flk_' +
		Array.from(bytes)
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('')
	);
}

const developer = new Hono<AppContext>();
developer.use('*', authMiddleware, reposMiddleware);
developer.use('*', requireRole('admin'));

// GET /developer/tokens
developer.get('/tokens', rateLimit('reads'), async (c) => {
	const repos = c.get('repos');
	const tokens = await repos.developerTokens.list();
	// Never expose hash; return safe subset
	const safe = tokens.map(({ token_hash: _h, ...rest }) => rest);
	return c.json({ tokens: safe });
});

// POST /developer/tokens
developer.post(
	'/tokens',
	rateLimit('writes'),
	validate(
		z.object({
			name: z.string().min(1).max(100),
			expires_in_days: z.number().int().positive().optional(),
		}),
	),
	async (c) => {
		const { name, expires_in_days } = c.get('validatedBody') as {
			name: string;
			expires_in_days?: number;
		};
		const repos = c.get('repos');
		const session = c.get('session');

		const rawToken = generateToken();
		const token_hash = await hashToken(rawToken);
		const token_prefix = rawToken.slice(0, TOKEN_PREFIX_LENGTH + 4); // "flk_" + 8 chars

		const expires_at = expires_in_days
			? new Date(Date.now() + expires_in_days * 86400000).toISOString()
			: null;

		const id = newId();
		await repos.developerTokens.create({
			id,
			user_id: session.user_id,
			name,
			token_hash,
			token_prefix,
			expires_at,
		});

		await logAudit(c, {
			action: 'create',
			entity_type: 'token',
			entity_id: id,
			description: `Created developer token "${name}"`,
		});

		// Return the full token once — it cannot be recovered afterwards
		return c.json({ id, name, token: rawToken, token_prefix, expires_at }, 201);
	},
);

// DELETE /developer/tokens/:id
developer.delete('/tokens/:id', rateLimit('writes'), async (c) => {
	const { id } = c.req.param();
	const repos = c.get('repos');

	const token = await repos.developerTokens.findById(id);
	if (!token) throw new NotFoundError('Token', id);

	await repos.developerTokens.revoke(id);

	await logAudit(c, {
		action: 'delete',
		entity_type: 'token',
		entity_id: id,
		description: `Revoked developer token "${token.name}"`,
	});

	return c.json({ success: true });
});

export { developer as developerRoutes };
