import type { AuditLog } from '@flarelens/shared';
import { BaseRepository } from '../repository.js';

export class AuditLogsRepository extends BaseRepository {
	async list(
		filters: {
			user_id?: string;
			action?: string;
			entity_type?: string;
			from?: string;
			to?: string;
			page?: number;
			per_page?: number;
		} = {},
	): Promise<{
		data: AuditLog[];
		total: number;
		page: number;
		per_page: number;
		total_pages: number;
	}> {
		const page = filters.page ?? 1;
		const perPage = filters.per_page ?? 50;

		const conditions = ['account_id = ?'];
		const params: unknown[] = [this.account_id];

		if (filters.user_id) {
			conditions.push('user_id = ?');
			params.push(filters.user_id);
		}
		if (filters.action) {
			conditions.push('action = ?');
			params.push(filters.action);
		}
		if (filters.entity_type) {
			conditions.push('entity_type = ?');
			params.push(filters.entity_type);
		}
		if (filters.from) {
			conditions.push('created_at >= ?');
			params.push(filters.from);
		}
		if (filters.to) {
			conditions.push('created_at <= ?');
			params.push(filters.to);
		}

		const where = conditions.join(' AND ');
		const query = `SELECT * FROM audit_logs WHERE ${where} ORDER BY created_at DESC`;
		const countQuery = `SELECT COUNT(*) as total FROM audit_logs WHERE ${where}`;

		return this.paginate<AuditLog>(query, countQuery, page, perPage, ...params);
	}

	async create(data: {
		id: string;
		user_id?: string | null;
		user_email?: string | null;
		action: string;
		entity_type: string;
		entity_id?: string | null;
		description: string;
		ip_address?: string | null;
		user_agent?: string | null;
		metadata?: Record<string, unknown>;
	}): Promise<void> {
		await this.run(
			`INSERT INTO audit_logs
       (id, account_id, user_id, user_email, action, entity_type, entity_id,
        description, ip_address, user_agent, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			data.id,
			this.account_id,
			data.user_id ?? null,
			data.user_email ?? null,
			data.action,
			data.entity_type,
			data.entity_id ?? null,
			data.description,
			data.ip_address ?? null,
			data.user_agent ?? null,
			JSON.stringify(data.metadata ?? {}),
		);
	}

	async exportQuery(
		filters: { user_id?: string; action?: string; from?: string; to?: string } = {},
	): Promise<AuditLog[]> {
		const conditions = ['account_id = ?'];
		const params: unknown[] = [this.account_id];

		if (filters.user_id) {
			conditions.push('user_id = ?');
			params.push(filters.user_id);
		}
		if (filters.action) {
			conditions.push('action = ?');
			params.push(filters.action);
		}
		if (filters.from) {
			conditions.push('created_at >= ?');
			params.push(filters.from);
		}
		if (filters.to) {
			conditions.push('created_at <= ?');
			params.push(filters.to);
		}

		return this.all<AuditLog>(
			`SELECT * FROM audit_logs WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
			...params,
		);
	}
}
