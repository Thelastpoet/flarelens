import { newId } from '@flarelens/shared';
import type { Context } from 'hono';
import type { AppContext } from './auth.js';

export interface AuditLogOptions {
	action: string;
	entity_type: string;
	entity_id?: string | null;
	description: string;
	metadata?: Record<string, unknown>;
}

export async function logAudit(c: Context<AppContext>, opts: AuditLogOptions): Promise<void> {
	try {
		const session = c.get('session');
		const repos = c.get('repos');

		const ip = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? null;
		const userAgent = c.req.header('User-Agent') ?? null;

		const user = await repos.users.findById(session.user_id);

		await repos.auditLogs.create({
			id: newId(),
			user_id: session.user_id,
			user_email: user?.email ?? null,
			action: opts.action,
			entity_type: opts.entity_type,
			entity_id: opts.entity_id ?? null,
			description: opts.description,
			ip_address: ip,
			user_agent: userAgent,
			metadata: opts.metadata ?? {},
		});
	} catch (err) {
		// Audit log failures must never break the primary request
		console.error('[AuditLog] Failed to write audit log:', err);
	}
}
