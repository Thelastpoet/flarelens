import { ConflictError, NotFoundError, PLAN_LIMITS, newId } from '@flarelens/shared';
import {
	CreateRuleSchema,
	UpdateRuleSchema,
	type CreateRuleInput,
	type UpdateRuleInput,
} from '@flarelens/shared/schemas/rules';
import { Hono } from 'hono';
import { logAudit } from '../middleware/audit.js';
import type { AppContext } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { requireRole } from '../middleware/rbac.js';
import { reposMiddleware } from '../middleware/repos.js';
import { validate } from '../middleware/validate.js';

const rules = new Hono<AppContext>();
rules.use('*', authMiddleware, reposMiddleware);

// GET /rules
rules.get('/', rateLimit('reads'), async (c) => {
	const repos = c.get('repos');
	const list = await repos.rules.list();
	return c.json({ rules: list });
});

// POST /rules
rules.post(
	'/',
	requireRole('admin', 'editor'),
	rateLimit('writes'),
	validate(CreateRuleSchema),
	async (c) => {
		const input = c.get('validatedBody') as CreateRuleInput;
		const repos = c.get('repos');
		const session = c.get('session');

		// Enforce plan rule count limit
		const account = await repos.accounts.findById();
		if (!account) throw new NotFoundError('Account');
		const plan = account.plan ?? 'free';
		const limit = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]?.max_rules ?? 5;
		const count = await repos.rules.count();
		if (count >= limit) {
			throw new ConflictError(
				`Your ${plan} plan allows a maximum of ${limit} rules. Upgrade to add more.`,
			);
		}

		const id = newId();
		const rule = await repos.rules.create({
			id,
			name: input.name,
			resource_type: input.resource_type,
			resource_id: input.resource_id ?? null,
			metric: input.metric,
			operator: input.operator,
			threshold: input.threshold,
			window: input.window,
			severity: input.severity,
			notify_frequency: input.notify_frequency,
			created_by: session.user_id,
		});

		await logAudit(c, {
			action: 'create',
			entity_type: 'rule',
			entity_id: id,
			description: `Created rule "${input.name}" (${input.metric} ${input.operator} ${input.threshold})`,
		});

		return c.json({ rule }, 201);
	},
);

// PATCH /rules/:id
rules.patch(
	'/:id',
	requireRole('admin', 'editor'),
	rateLimit('writes'),
	validate(UpdateRuleSchema),
	async (c) => {
		const { id } = c.req.param();
		const input = c.get('validatedBody') as UpdateRuleInput;
		const repos = c.get('repos');

		const existing = await repos.rules.findById(id);
		if (!existing) throw new NotFoundError('Rule', id);

		await repos.rules.update(id, input);

		await logAudit(c, {
			action: 'update',
			entity_type: 'rule',
			entity_id: id,
			description: `Updated rule "${existing.name}"`,
		});

		const updated = await repos.rules.findById(id);
		return c.json({ rule: updated });
	},
);

// PATCH /rules/:id/toggle
rules.patch('/:id/toggle', requireRole('admin', 'editor'), rateLimit('writes'), async (c) => {
	const { id } = c.req.param();
	const repos = c.get('repos');

	const existing = await repos.rules.findById(id);
	if (!existing) throw new NotFoundError('Rule', id);

	const newEnabled = !existing.enabled;
	await repos.rules.toggle(id, newEnabled);

	await logAudit(c, {
		action: 'update',
		entity_type: 'rule',
		entity_id: id,
		description: `${newEnabled ? 'Enabled' : 'Disabled'} rule "${existing.name}"`,
	});

	return c.json({ success: true, enabled: newEnabled });
});

// DELETE /rules/:id — soft delete
rules.delete('/:id', requireRole('admin', 'editor'), rateLimit('writes'), async (c) => {
	const { id } = c.req.param();
	const repos = c.get('repos');

	const existing = await repos.rules.findById(id);
	if (!existing) throw new NotFoundError('Rule', id);

	await repos.rules.delete(id);

	await logAudit(c, {
		action: 'delete',
		entity_type: 'rule',
		entity_id: id,
		description: `Deleted rule "${existing.name}"`,
	});

	return c.json({ success: true });
});

export { rules as rulesRoutes };
