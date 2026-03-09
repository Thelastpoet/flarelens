import { NotFoundError, newId } from '@flarelens/shared';
import { z } from 'zod';
import { Hono } from 'hono';
import { validate } from '../middleware/validate.js';
import { logAudit } from '../middleware/audit.js';
import type { AppContext } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { requireRole } from '../middleware/rbac.js';
import { reposMiddleware } from '../middleware/repos.js';
import { decryptToken } from '../auth/crypto.js';
import { CloudflareClient } from '../services/cloudflare/client.js';
import { executeMitigation } from '../services/mitigation/executor.js';
import type { ActionType, MitigationActionConfig } from '../services/mitigation/executor.js';

const MitigationSchema = z.object({
	name: z.string().min(1).max(100),
	trigger_type: z.enum(['traffic_rate', 'error_spike', 'cost_threshold']),
	trigger_condition: z.object({
		metric: z.string(),
		operator: z.enum(['gt', 'lt', 'gte', 'lte']),
		threshold: z.number(),
	}),
	action_type: z.enum(['rate_limit', 'under_attack_mode', 'block_ua', 'pause_worker']),
	action_config: z.record(z.string(), z.unknown()),
	resource_id: z.string().optional().nullable(),
});

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
	validate(MitigationSchema),
	async (c) => {
		const input = c.get('validatedBody') as z.infer<typeof MitigationSchema>;
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

		await logAudit(c, { action: 'create', entity_type: 'mitigation', entity_id: id, description: `Created mitigation rule "${input.name}"` });
		return c.json({ mitigation }, 201);
	},
);

// PATCH /mitigations/:id
mitigations.patch(
	'/:id',
	requireRole('admin', 'editor'),
	rateLimit('writes'),
	validate(MitigationSchema.partial()),
	async (c) => {
		const { id } = c.req.param();
		const input = c.get('validatedBody') as Partial<z.infer<typeof MitigationSchema>>;
		const repos = c.get('repos');

		const existing = await repos.mitigations.findById(id);
		if (!existing) throw new NotFoundError('Mitigation', id);

		await repos.mitigations.update(id, {
			...(input.name && { name: input.name }),
			...(input.trigger_condition && { trigger_condition: input.trigger_condition }),
			...(input.action_config && { action_config: input.action_config }),
			...(input.resource_id !== undefined && { resource_id: input.resource_id ?? null }),
		});

		await logAudit(c, { action: 'update', entity_type: 'mitigation', entity_id: id, description: `Updated mitigation "${existing.name}"` });
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

	await logAudit(c, { action: 'update', entity_type: 'mitigation', entity_id: id, description: `${newEnabled ? 'Enabled' : 'Disabled'} mitigation "${existing.name}"` });
	return c.json({ success: true, enabled: newEnabled });
});

// DELETE /mitigations/:id
mitigations.delete('/:id', requireRole('admin', 'editor'), rateLimit('writes'), async (c) => {
	const { id } = c.req.param();
	const repos = c.get('repos');

	const existing = await repos.mitigations.findById(id);
	if (!existing) throw new NotFoundError('Mitigation', id);

	await repos.mitigations.delete(id);
	await logAudit(c, { action: 'delete', entity_type: 'mitigation', entity_id: id, description: `Deleted mitigation "${existing.name}"` });
	return c.json({ success: true });
});

// POST /mitigations/:id/trigger — manual trigger
mitigations.post('/:id/trigger', requireRole('admin', 'editor'), rateLimit('writes'), async (c) => {
	const { id } = c.req.param();
	const repos = c.get('repos');

	const mitigation = await repos.mitigations.findById(id);
	if (!mitigation) throw new NotFoundError('Mitigation', id);

	const cfTokens = await repos.cfTokens.findActiveByAccount();
	if (!cfTokens.length) return c.json({ success: false, detail: 'No active Cloudflare token' }, 422);

	const plainToken = await decryptToken(cfTokens[0].encrypted_token, c.env.TOKEN_ENCRYPTION_KEY);
	const cfAccountId = cfTokens[0].cf_account_id ?? '';
	const client = new CloudflareClient(plainToken, cfAccountId);
	const actionConfig = JSON.parse(mitigation.action_config) as MitigationActionConfig;

	const result = await executeMitigation(client, mitigation.action_type as ActionType, actionConfig);
	await repos.mitigations.recordTrigger(id, 0);

	await logAudit(c, { action: 'system', entity_type: 'mitigation', entity_id: id, description: `Manually triggered mitigation "${mitigation.name}": ${result.detail}` });
	return c.json(result);
});

export { mitigations as mitigationsRoutes };
