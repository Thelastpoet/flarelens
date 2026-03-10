import { Hono } from 'hono';
import { z } from 'zod';
import { ValidationError } from '@flarelens/shared';
import type { AppContext } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { requireRole } from '../middleware/rbac.js';
import { reposMiddleware } from '../middleware/repos.js';

const auditLogs = new Hono<AppContext>();
auditLogs.use('*', authMiddleware, reposMiddleware, requireRole('admin'));

const AuditLogQuerySchema = z.object({
	user_id: z.string().optional(),
	action: z.string().optional(),
	entity_type: z.string().optional(),
	from: z.string().optional(),
	to: z.string().optional(),
	page: z.coerce.number().int().positive().optional(),
	per_page: z.coerce.number().int().positive().max(100).optional(),
});

// GET /audit-logs
auditLogs.get('/', rateLimit('reads'), async (c) => {
	const repos = c.get('repos');
	const parsed = AuditLogQuerySchema.safeParse({
		user_id: c.req.query('user_id'),
		action: c.req.query('action'),
		entity_type: c.req.query('entity_type'),
		from: c.req.query('from'),
		to: c.req.query('to'),
		page: c.req.query('page'),
		per_page: c.req.query('per_page'),
	});
	if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.issues);
	const q = parsed.data;

	const result = await repos.auditLogs.list({
		user_id: q.user_id,
		action: q.action,
		entity_type: q.entity_type,
		from: q.from,
		to: q.to,
		page: q.page,
		per_page: q.per_page,
	});

	return c.json(result);
});

// GET /audit-logs/export — CSV download
auditLogs.get('/export', rateLimit('reads'), async (c) => {
	const repos = c.get('repos');
	const parsed = AuditLogQuerySchema.safeParse({
		user_id: c.req.query('user_id'),
		action: c.req.query('action'),
		from: c.req.query('from'),
		to: c.req.query('to'),
	});
	if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.issues);
	const q = parsed.data;

	const logs = await repos.auditLogs.exportQuery({
		user_id: q.user_id,
		action: q.action,
		from: q.from,
		to: q.to,
	});

	const header = 'timestamp,user_email,action,entity_type,entity_id,description\n';
	const rows = logs.map((l) =>
		[
			l.created_at,
			l.user_email ?? '',
			l.action,
			l.entity_type,
			l.entity_id ?? '',
			`"${l.description.replace(/"/g, '""')}"`,
		].join(','),
	);
	const csv = header + rows.join('\n');

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv',
			'Content-Disposition': `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
		},
	});
});

export { auditLogs as auditLogsRoutes };
