import { CF_REQUIRED_CAPABILITIES, NotFoundError, ValidationError, newId } from '@flarelens/shared';
import { AddCfTokenSchema, type AddCfTokenInput } from '@flarelens/shared/schemas/cf-tokens';
import type { Context } from 'hono';
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

async function logVerificationFailure(
	c: Context<AppContext>,
	opts: {
		tokenId: string;
		label: string;
		stage: string;
		message: string;
		metadata?: Record<string, unknown>;
	},
): Promise<void> {
	await logAudit(c as never, {
		action: 'update',
		entity_type: 'token',
		entity_id: opts.tokenId,
		description: `Cloudflare token verification failed for "${opts.label}": ${opts.message}`,
		metadata: {
			stage: opts.stage,
			outcome: 'failed',
			...opts.metadata,
		},
	});
}

// GET /cf-tokens — list tokens (masked)
cfTokens.get('/', rateLimit('reads'), async (c) => {
	const repos = c.get('repos');
	const tokens = await repos.cfTokens.list();
	// Repository output already blanks encrypted_token for list responses.
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
	const client = new CloudflareClient(plainToken, tokenRow.cf_account_id);

	let verifyResult: import('../services/cloudflare/client.js').CfTokenVerifyResult;
	try {
		verifyResult = await client.verifyToken();
	} catch (err) {
		if (
			err instanceof ValidationError ||
			(err instanceof Error && err.name === 'ValidationError') ||
			(typeof err === 'object' &&
				err !== null &&
				'code' in err &&
				err.code === 'VALIDATION_ERROR')
		) {
			throw err;
		}
		const message =
			err instanceof Error
				? err.message
				: 'Cloudflare token verification failed before capability checks could run';
		await repos.cfTokens.updateStatus({
			id,
			status: 'invalid',
			verification_error: message,
		});
		await logVerificationFailure(c, {
			tokenId: id,
			label: tokenRow.label,
			stage: 'verify_token',
			message,
		});
		console.warn('[CfTokenVerify] Token verification request failed', {
			token_id: id,
			account_id: c.get('session').account_id,
			error: message,
		});
		throw new ValidationError(
			'Cloudflare token verification failed. Check the token is valid and retry.',
		);
	}

	if (verifyResult.status !== 'active') {
		const verificationDetails = client.buildVerificationDetails({
			verifyResult,
			account: {
				id: tokenRow.cf_account_id,
				name: null,
				source: tokenRow.cf_account_id ? 'stored' : null,
			},
			probes: [],
		});
		await repos.cfTokens.updateStatus({
			id,
			status: 'invalid',
			verification_error: `Token status is '${verifyResult.status}', expected 'active'`,
			verification_details: verificationDetails,
		});
		await logVerificationFailure(c, {
			tokenId: id,
			label: tokenRow.label,
			stage: 'token_status',
			message: `Token status is '${verifyResult.status}', expected 'active'`,
			metadata: { token_status: verifyResult.status },
		});
		throw new ValidationError(`Token status is '${verifyResult.status}', expected 'active'`);
	}

	let account: { id: string; name: string | null; source: import('@flarelens/shared').CfAccountSource };
	let capabilityResult: {
		capabilities: import('@flarelens/shared').CfCapability[];
		probes: import('@flarelens/shared').CfCapabilityProbe[];
	};
	let verificationDetails: import('@flarelens/shared').CfTokenVerificationDetails;
	try {
		account = await client.resolveAccount(tokenRow.cf_account_id);
		capabilityResult = await client.probeCapabilities(account.id);
		verificationDetails = client.buildVerificationDetails({
			verifyResult,
			account,
			probes: capabilityResult.probes,
		});
	} catch (err) {
		const message =
			err instanceof Error
				? err.message
				: 'Cloudflare token verification completed but capability validation failed';
		const verificationDetails = client.buildVerificationDetails({
			verifyResult,
			account: {
				id: tokenRow.cf_account_id,
				name: null,
				source: tokenRow.cf_account_id ? 'stored' : null,
			},
			probes: [],
		});
		await repos.cfTokens.updateStatus({
			id,
			status: 'invalid',
			verification_error: message,
			verification_details: verificationDetails,
		});
		await logVerificationFailure(c, {
			tokenId: id,
			label: tokenRow.label,
			stage: 'capability_probe',
			message,
		});
		console.warn('[CfTokenVerify] Capability validation failed', {
			token_id: id,
			account_id: c.get('session').account_id,
			error: message,
		});
		throw new ValidationError(message);
	}

	const missingCapabilities = CF_REQUIRED_CAPABILITIES.filter(
		(capability) => !capabilityResult.capabilities.includes(capability),
	);
	if (missingCapabilities.length > 0) {
		const message = `Token is missing required verified capability: ${missingCapabilities.join(', ')}`;
		await repos.cfTokens.updateStatus({
			id,
			status: 'invalid',
			cf_account_id: account.id,
			permissions: capabilityResult.capabilities,
			capabilities: capabilityResult.capabilities,
			verification_error: message,
			verification_details: verificationDetails,
		});
		await logVerificationFailure(c, {
			tokenId: id,
			label: tokenRow.label,
			stage: 'required_capabilities',
			message,
			metadata: { missing_capabilities: missingCapabilities, cf_account_id: account.id },
		});
		console.warn('[CfTokenVerify] Missing required capabilities', {
			token_id: id,
			account_id: c.get('session').account_id,
			cf_account_id: account.id,
			missing_capabilities: missingCapabilities,
		});
		throw new ValidationError(message, { missing_capabilities: missingCapabilities });
	}

	await repos.cfTokens.markVerified({
		id,
		cf_account_id: account.id,
		permissions: capabilityResult.capabilities,
		capabilities: capabilityResult.capabilities,
		verification_details: verificationDetails,
	});
	await repos.cfTokens.markUsed(id);

	await logAudit(c, {
		action: 'update',
		entity_type: 'token',
		entity_id: id,
		description: `Verified Cloudflare API token: ${tokenRow.label}`,
		metadata: {
			cf_account_id: account.id,
			capabilities: capabilityResult.capabilities,
		},
	});

	return c.json({
		verified: true,
		cf_account_id: account.id,
		account_name: account.name,
		capabilities: capabilityResult.capabilities,
		permissions: capabilityResult.capabilities,
	});
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
