import { NotFoundError, ValidationError, newId, PLAN_LIMITS } from '@flarelens/shared';
import { UpdateResourceSchema, type UpdateResourceInput } from '@flarelens/shared/schemas/resources';
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

const resources = new Hono<AppContext>();
resources.use('*', authMiddleware, reposMiddleware);

// GET /resources — list all monitored resources
resources.get('/', rateLimit('reads'), async (c) => {
	const repos = c.get('repos');
	const type = c.req.query('type');
	const list = await repos.resources.list(type);
	return c.json({ resources: list });
});

// GET /resources/:id — resource detail
resources.get('/:id', rateLimit('reads'), async (c) => {
	const { id } = c.req.param();
	const repos = c.get('repos');
	const resource = await repos.resources.findById(id);
	if (!resource) throw new NotFoundError('Resource', id);
	return c.json({ resource });
});

// PATCH /resources/:id — update monitoring status
resources.patch(
	'/:id',
	requireRole('admin', 'editor'),
	rateLimit('writes'),
	validate(UpdateResourceSchema),
	async (c) => {
		const { id } = c.req.param();
		const input = c.get('validatedBody') as UpdateResourceInput;
		const repos = c.get('repos');

		const resource = await repos.resources.findById(id);
		if (!resource) throw new NotFoundError('Resource', id);

		if (input.monitoring_status === 'active') {
			const account = await repos.accounts.findById();
			const limit = PLAN_LIMITS[account?.plan as keyof typeof PLAN_LIMITS]?.max_resources ?? 3;
			const active = (await repos.resources.list()).filter((r) => r.monitoring_status === 'active');
			if (active.length >= limit && resource.monitoring_status !== 'active') {
				throw new ValidationError(`Plan limit reached: max ${limit} monitored resource${limit === 1 ? '' : 's'}`);
			}
		}

		await repos.resources.update(id, { monitoring_status: input.monitoring_status });

		await logAudit(c, {
			action: 'update',
			entity_type: 'resource',
			entity_id: id,
			description: `Set resource '${resource.name}' monitoring to ${input.monitoring_status}`,
		});

		return c.json({ success: true });
	},
);

// DELETE /resources/:id — remove resource from monitoring
resources.delete('/:id', requireRole('admin'), rateLimit('writes'), async (c) => {
	const { id } = c.req.param();
	const repos = c.get('repos');

	const resource = await repos.resources.findById(id);
	if (!resource) throw new NotFoundError('Resource', id);

	await repos.resources.delete(id);

	await logAudit(c, {
		action: 'delete',
		entity_type: 'resource',
		entity_id: id,
		description: `Removed resource '${resource.name}' from monitoring`,
	});

	return c.json({ success: true });
});

// POST /resources/sync — sync resources from CF API
resources.post('/sync', requireRole('admin', 'editor'), rateLimit('writes'), async (c) => {
	const repos = c.get('repos');
	const _session = c.get('session');

	const activeTokens = await repos.cfTokens.findActiveByAccount();
	if (activeTokens.length === 0) {
		return c.json({ synced: 0, message: 'No active Cloudflare tokens found' });
	}

	let totalSynced = 0;

	for (const tokenRow of activeTokens) {
		const cfAccountId = tokenRow.cf_account_id ?? '';
		if (!cfAccountId) continue;

		const plainToken = await decryptToken(tokenRow.encrypted_token, c.env.TOKEN_ENCRYPTION_KEY);
		const client = new CloudflareClient(plainToken, cfAccountId);

		// Sync in parallel per resource type
		const [zones, workers, r2Buckets, kvNamespaces, d1Databases] = await Promise.allSettled([
			client.listZones(),
			client.listWorkers(),
			client.listR2Buckets(),
			client.listKvNamespaces(),
			client.listD1Databases(),
		]);

		const _now = new Date().toISOString();

		if (zones.status === 'fulfilled') {
			for (const zone of zones.value) {
				await repos.resources.upsertFromCF({
					id: newId(),
					cf_token_id: tokenRow.id,
					cf_resource_id: zone.id,
					type: 'zone',
					name: zone.name,
					metadata: { status: zone.status, plan: zone.plan?.name },
				});
				totalSynced++;
			}
		}

		if (workers.status === 'fulfilled') {
			for (const worker of workers.value) {
				await repos.resources.upsertFromCF({
					id: newId(),
					cf_token_id: tokenRow.id,
					cf_resource_id: worker.id,
					type: 'worker',
					name: worker.id,
					metadata: { modified_on: worker.modified_on },
				});
				totalSynced++;
			}
		}

		if (r2Buckets.status === 'fulfilled') {
			for (const bucket of r2Buckets.value) {
				await repos.resources.upsertFromCF({
					id: newId(),
					cf_token_id: tokenRow.id,
					cf_resource_id: bucket.name,
					type: 'r2_bucket',
					name: bucket.name,
					metadata: { creation_date: bucket.creation_date },
				});
				totalSynced++;
			}
		}

		if (kvNamespaces.status === 'fulfilled') {
			for (const ns of kvNamespaces.value) {
				await repos.resources.upsertFromCF({
					id: newId(),
					cf_token_id: tokenRow.id,
					cf_resource_id: ns.id,
					type: 'kv_namespace',
					name: ns.title,
					metadata: {},
				});
				totalSynced++;
			}
		}

		if (d1Databases.status === 'fulfilled') {
			for (const db of d1Databases.value) {
				await repos.resources.upsertFromCF({
					id: newId(),
					cf_token_id: tokenRow.id,
					cf_resource_id: db.uuid,
					type: 'd1_database',
					name: db.name,
					metadata: {},
				});
				totalSynced++;
			}
		}

		await repos.cfTokens.markUsed(tokenRow.id);
	}

	await logAudit(c, {
		action: 'system',
		entity_type: 'resource',
		description: `Synced ${totalSynced} resources from Cloudflare`,
		metadata: { total_synced: totalSynced },
	});

	return c.json({ synced: totalSynced });
});

export { resources as resourcesRoutes };
