import { Hono } from 'hono';
import type { AppContext } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { requireRole } from '../middleware/rbac.js';
import { reposMiddleware } from '../middleware/repos.js';

const auditLogs = new Hono<AppContext>();
auditLogs.use('*', authMiddleware, reposMiddleware, requireRole('admin'));

// GET /audit-logs
auditLogs.get('/', rateLimit('reads'), async (c) => {
	const repos = c.get('repos');
	const q = c.req.query;

	const result = await repos.auditLogs.list({
		user_id: q('user_id'),
		action: q('action'),
		entity_type: q('entity_type'),
		from: q('from'),
		to: q('to'),
		page: q('page') ? +q('page')! : undefined,
		per_page: q('per_page') ? +q('per_page')! : undefined,
	});

	return c.json(result);
});

// GET /audit-logs/export — CSV download
auditLogs.get('/export', rateLimit('reads'), async (c) => {
	const repos = c.get('repos');
	const q = c.req.query;

	const logs = await repos.auditLogs.exportQuery({
		user_id: q('user_id'),
		action: q('action'),
		from: q('from'),
		to: q('to'),
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
