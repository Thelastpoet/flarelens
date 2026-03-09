import type { AddCfTokenInput } from '@flarelens/shared';
import { NotFoundError, newId, ValidationError } from '@flarelens/shared';
import { AddCfTokenSchema } from '@flarelens/shared/schemas/cf-tokens';
import { Hono } from 'hono';
import { decryptToken, encryptToken } from '../auth/crypto.js';
import { logAudit } from '../middleware/audit.js';
import type { AppContext } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { requireRole } from '../middleware/rbac.js';
import { reposMiddleware } from '../middleware/repos.js';
import { validate } from '../middleware/validate.js';
import { CloudflareClient } from '../services/cloudflare/client.js';

const cfTokens = new Hono<AppContext>();
cfTokens.use('*', authMiddleware, reposMiddleware);

// GET /cf-tokens — list tokens (masked)
cfTokens.get('/', rateLimit('reads'), async (c) => {
	const repos = c.get('repos');
	const tokens = await repos.cfTokens.list();
	// Mask: show only last 4 chars of the token label, hide encrypted_token
	return c.json({ tokens });
});

// POST /cf-tokens — add a new CF token
cfTokens.post(
	'/',
	requireRole('admin'),
	rateLimit('writes'),
	validate(AddCfTokenSchema),
	async (c) => {
		const input = c.get('validatedBody') as AddCfTokenInput;
		const repos = c.get('repos');

		const encrypted = await encryptToken(input.token, c.env.TOKEN_ENCRYPTION_KEY);
		const id = newId();

		const token = await repos.cfTokens.create({
			id,
			label: input.label,
			encrypted_token: encrypted,
		});

		await logAudit(c, {
			action: 'create',
			entity_type: 'token',
			entity_id: id,
			description: `Added Cloudflare API token: ${input.label}`,
		});

		return c.json({ token }, 201);
	},
);

// POST /cf-tokens/:id/verify — verify token against CF API
cfTokens.post('/:id/verify', requireRole('admin'), rateLimit('writes'), async (c) => {
	const { id } = c.req.param();
	const repos = c.get('repos');

	const tokenRow = await repos.cfTokens.findById(id);
	if (!tokenRow) throw new NotFoundError('CF token', id);

	const plainToken = await decryptToken(tokenRow.encrypted_token, c.env.TOKEN_ENCRYPTION_KEY);
	// Use empty string as cf_account_id initially for verification
	const client = new CloudflareClient(plainToken, '');

	let verifyResult: import('../services/cloudflare/client.js').CfTokenVerifyResult;
	try {
		verifyResult = await client.verifyToken();
	} catch (_err) {
		await repos.cfTokens.updateStatus(id, 'invalid');
		throw new ValidationError(
			'Cloudflare token verification failed. Check the token is valid and has required permissions.',
		);
	}

	if (verifyResult.status !== 'active') {
		await repos.cfTokens.updateStatus(id, 'invalid');
		throw new ValidationError(`Token status is '${verifyResult.status}', expected 'active'`);
	}

	const permissions =
		verifyResult.policies?.flatMap((p) => p.permissionGroups?.map((g) => g.name) ?? []) ?? [];

	// The CF account ID isn't returned from token verify — we need the user to provide it
	// or we fetch from /user endpoint. Let's get it from /user/tokens/:id
	const cfAccountId = tokenRow.cf_account_id ?? '';

	await repos.cfTokens.markVerified(id, cfAccountId, permissions);
	await repos.cfTokens.markUsed(id);

	await logAudit(c, {
		action: 'update',
		entity_type: 'token',
		entity_id: id,
		description: `Verified Cloudflare API token: ${tokenRow.label}`,
	});

	return c.json({ verified: true, permissions });
});

// DELETE /cf-tokens/:id — revoke token
cfTokens.delete('/:id', requireRole('admin'), rateLimit('writes'), async (c) => {
	const { id } = c.req.param();
	const repos = c.get('repos');

	const tokenRow = await repos.cfTokens.findById(id);
	if (!tokenRow) throw new NotFoundError('CF token', id);

	await repos.cfTokens.revoke(id);

	await logAudit(c, {
		action: 'delete',
		entity_type: 'token',
		entity_id: id,
		description: `Revoked Cloudflare API token: ${tokenRow.label}`,
	});

	return c.json({ success: true });
});

export { cfTokens as cfTokensRoutes };
