import { NotFoundError, ValidationError } from '@flarelens/shared';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppContext } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { reposMiddleware } from '../middleware/repos.js';

const notifications = new Hono<AppContext>();
notifications.use('*', authMiddleware, reposMiddleware);

const NotificationListQuerySchema = z.object({
	read: z.enum(['true', 'false']).optional(),
	page: z.coerce.number().int().positive().optional(),
	per_page: z.coerce.number().int().positive().max(100).optional(),
});

// GET /notifications — list notifications
notifications.get('/', rateLimit('reads'), async (c) => {
	const repos = c.get('repos');
	const session = c.get('session');
	const parsed = NotificationListQuerySchema.safeParse({
		read: c.req.query('read'),
		page: c.req.query('page'),
		per_page: c.req.query('per_page'),
	});
	if (!parsed.success) throw new ValidationError('Validation failed', parsed.error.issues);
	const { read: readParam, page, per_page } = parsed.data;

	const read =
		readParam === 'true' ? true : readParam === 'false' ? false : undefined;

	const result = await repos.notifications.list(session.user_id, {
		read,
		page: page ? +page : undefined,
		per_page: per_page ? +per_page : undefined,
	});

	return c.json(result);
});

// PATCH /notifications/:id/read — mark single notification as read
notifications.patch('/:id/read', rateLimit('writes'), async (c) => {
	const { id } = c.req.param();
	const repos = c.get('repos');
	const session = c.get('session');
	const notification = await repos.notifications.findAccessibleById(id, session.user_id);
	if (!notification) throw new NotFoundError('Notification', id);
	await repos.notifications.markRead(id, session.user_id);
	return c.json({ success: true });
});

// POST /notifications/mark-all-read — mark all notifications as read
notifications.post('/mark-all-read', rateLimit('writes'), async (c) => {
	const repos = c.get('repos');
	const session = c.get('session');
	await repos.notifications.markAllRead(session.user_id);
	return c.json({ success: true });
});

// POST /notifications/archive-all — archive all notifications
notifications.post('/archive-all', rateLimit('writes'), async (c) => {
	const repos = c.get('repos');
	const session = c.get('session');
	await repos.notifications.archiveAll(session.user_id);
	return c.json({ success: true });
});

export { notifications as notificationsRoutes };
