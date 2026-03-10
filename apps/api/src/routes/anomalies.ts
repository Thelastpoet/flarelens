import { NotFoundError, ValidationError } from '@flarelens/shared';
import { Hono } from 'hono';
import { z } from 'zod';
import { logAudit } from '../middleware/audit.js';
import type { AppContext } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { requireRole } from '../middleware/rbac.js';
import { reposMiddleware } from '../middleware/repos.js';

const anomalies = new Hono<AppContext>();
anomalies.use('*', authMiddleware, reposMiddleware);

const AnomalyListQuerySchema = z.object({
	status: z.enum(['active', 'dismissed', 'resolved']).optional(),
	severity: z.enum(['warning', 'high', 'critical']).optional(),
	resource_id: z.string().optional(),
	page: z.coerce.number().int().positive().optional(),
	per_page: z.coerce.number().int().positive().max(100).optional(),
});

// GET /anomalies — list anomalies with optional filters
anomalies.get('/', rateLimit('reads'), async (c) => {
	const repos = c.get('repos');
	const parsed = AnomalyListQuerySchema.safeParse({
		status: c.req.query('status'),
		severity: c.req.query('severity'),
		resource_id: c.req.query('resource_id'),
		page: c.req.query('page'),
		per_page: c.req.query('per_page'),
	});
	if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.issues);
	const { status, severity, resource_id, page, per_page } = parsed.data;

	const result = await repos.anomalies.list({
		status,
		severity,
		resource_id,
		page,
		per_page,
	});

	return c.json(result);
});

// GET /anomalies/:id — anomaly detail
anomalies.get('/:id', rateLimit('reads'), async (c) => {
	const { id } = c.req.param();
	const repos = c.get('repos');
	const anomaly = await repos.anomalies.findById(id);
	if (!anomaly) throw new NotFoundError('Anomaly', id);
	return c.json({ anomaly });
});

// PATCH /anomalies/:id/dismiss — dismiss an anomaly
anomalies.patch('/:id/dismiss', requireRole('admin', 'editor'), rateLimit('writes'), async (c) => {
	const { id } = c.req.param();
	const repos = c.get('repos');
	const session = c.get('session');

	const anomaly = await repos.anomalies.findById(id);
	if (!anomaly) throw new NotFoundError('Anomaly', id);

	await repos.anomalies.dismiss(id, session.user_id);

	await logAudit(c, {
		action: 'dismiss',
		entity_type: 'anomaly',
		entity_id: id,
		description: `Dismissed anomaly ${id} (${anomaly.metric})`,
	});

	return c.json({ success: true });
});

export { anomalies as anomaliesRoutes };
