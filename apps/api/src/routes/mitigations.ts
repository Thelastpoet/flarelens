import { NotFoundError, newId, ValidationError } from '@flarelens/shared';
import {
	type CreateMitigationInput,
	CreateMitigationSchema,
	type TriggerMitigationInput,
	TriggerMitigationSchema,
	type UpdateMitigationInput,
	UpdateMitigationSchema,
} from '@flarelens/shared/schemas/mitigations';
import { Hono } from 'hono';
import { decryptToken } from '../auth/crypto.js';
import { logAudit } from '../middleware/audit.js';
import type { AppContext } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { requireRole } from '../middleware/rbac.js';
import { reposMiddleware } from '../middleware/repos.js';
import { validate } from '../middleware/validate.js';
import { CloudflareClient } from '../services/cloudflare/client.js';
import type { ActionType, MitigationActionConfig } from '../services/mitigation/executor.js';
import { executeMitigation } from '../services/mitigation/executor.js';

const mitigations = new Hono<AppContext>();
mitigations.use('*', authMiddleware, reposMiddleware);

// GET /mitigations
mitigations.get('/', rateLimit('reads'), async (c) => {
	const repos = c.get('repos');
	const list = await repos.mitigations.list();
	return c.json({ mitigations: list });
});

// POST /mitigations
mitigations.post(
	'/',
	requireRole('admin', 'editor'),
	rateLimit('writes'),
	validate(CreateMitigationSchema),
	async (c) => {
		const input = c.get('validatedBody') as CreateMitigationInput;
		const repos = c.get('repos');
		const session = c.get('session');

		const id = newId();
		const mitigation = await repos.mitigations.create({
			id,
			name: input.name,
			trigger_type: input.trigger_type,
			trigger_condition: input.trigger_condition,
			action_type: input.action_type,
			action_config: input.action_config,
			resource_id: input.resource_id ?? null,
			created_by: session.user_id,
		});

		await logAudit(c, {
			action: 'create',
			entity_type: 'mitigation',
			entity_id: id,
			description: `Created mitigation rule "${input.name}"`,
		});
		return c.json({ mitigation }, 201);
	},
);

// PATCH /mitigations/:id
mitigations.patch(
	'/:id',
	requireRole('admin', 'editor'),
	rateLimit('writes'),
	validate(UpdateMitigationSchema),
	async (c) => {
		const { id } = c.req.param();
		const input = c.get('validatedBody') as UpdateMitigationInput;
		const repos = c.get('repos');

		const existing = await repos.mitigations.findById(id);
		if (!existing) throw new NotFoundError('Mitigation', id);

		await repos.mitigations.update(id, {
			...(input.name && { name: input.name }),
			...(input.trigger_condition && { trigger_condition: input.trigger_condition }),
			...(input.action_config && { action_config: input.action_config }),
			...(input.resource_id !== undefined && { resource_id: input.resource_id ?? null }),
		});

		await logAudit(c, {
			action: 'update',
			entity_type: 'mitigation',
			entity_id: id,
			description: `Updated mitigation "${existing.name}"`,
		});
		return c.json({ success: true });
	},
);

// PATCH /mitigations/:id/toggle
mitigations.patch('/:id/toggle', requireRole('admin', 'editor'), rateLimit('writes'), async (c) => {
	const { id } = c.req.param();
	const repos = c.get('repos');

	const existing = await repos.mitigations.findById(id);
	if (!existing) throw new NotFoundError('Mitigation', id);

	const newEnabled = !existing.enabled;
	await repos.mitigations.toggle(id, newEnabled);

	await logAudit(c, {
		action: 'update',
		entity_type: 'mitigation',
		entity_id: id,
		description: `${newEnabled ? 'Enabled' : 'Disabled'} mitigation "${existing.name}"`,
	});
	return c.json({ success: true, enabled: newEnabled });
});

// DELETE /mitigations/:id
mitigations.delete('/:id', requireRole('admin', 'editor'), rateLimit('writes'), async (c) => {
	const { id } = c.req.param();
	const repos = c.get('repos');

	const existing = await repos.mitigations.findById(id);
	if (!existing) throw new NotFoundError('Mitigation', id);

	await repos.mitigations.delete(id);
	await logAudit(c, {
		action: 'delete',
		entity_type: 'mitigation',
		entity_id: id,
		description: `Deleted mitigation "${existing.name}"`,
	});
	return c.json({ success: true });
});

// POST /mitigations/:id/trigger — manual trigger
mitigations.post(
	'/:id/trigger',
	requireRole('admin', 'editor'),
	rateLimit('writes'),
	validate(TriggerMitigationSchema),
	async (c) => {
		const { id } = c.req.param();
		const input = c.get('validatedBody') as TriggerMitigationInput;
		const repos = c.get('repos');

		const mitigation = await repos.mitigations.findById(id);
		if (!mitigation) throw new NotFoundError('Mitigation', id);
		if (input.dry_run === false && input.confirm !== true) {
			throw new ValidationError(
				'Manual mitigation execution requires confirm=true when dry_run is false',
			);
		}

		const cfTokens = await repos.cfTokens.findVerifiedByAccount();
		if (!cfTokens.length) {
			return c.json(
				{
					success: false,
					detail: 'No verified Cloudflare token is available for mitigation execution',
				},
				422,
			);
		}

		const plainToken = await decryptToken(cfTokens[0].encrypted_token, c.env.TOKEN_ENCRYPTION_KEY);
		const cfAccountId = cfTokens[0].cf_account_id ?? '';
		const client = new CloudflareClient(plainToken, cfAccountId);
		const actionConfig = JSON.parse(mitigation.action_config) as MitigationActionConfig;
		const result = await executeMitigation(
			client,
			mitigation.action_type as ActionType,
			actionConfig,
			{ dryRun: input.dry_run },
		);

		if (result.executed) {
			await repos.mitigations.recordTrigger(id, 0);
		}

		await logAudit(c, {
			action: 'system',
			entity_type: 'mitigation',
			entity_id: id,
			description: `Manually triggered mitigation "${mitigation.name}": ${result.detail}`,
			metadata: {
				confirm: input.confirm,
				dry_run: result.dry_run,
				executed: result.executed,
				provider_action: result.provider_action,
				provider_reference: result.provider_reference,
				request: result.request,
				response: result.response,
			},
		});
		return c.json(result);
	},
);

export { mitigations as mitigationsRoutes };
