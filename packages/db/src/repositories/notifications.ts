import type { Notification } from '@flarelens/shared';
import { BaseRepository } from '../repository.js';

export class NotificationsRepository extends BaseRepository {
	async list(
		user_id?: string | null,
		filters: { read?: boolean; archived?: boolean; page?: number; per_page?: number } = {},
	): Promise<{
		data: Notification[];
		total: number;
		page: number;
		per_page: number;
		total_pages: number;
	}> {
		const page = filters.page ?? 1;
		const perPage = filters.per_page ?? 25;

		const conditions = ['account_id = ?', 'archived = 0'];
		const params: unknown[] = [this.account_id];

		if (user_id !== undefined) {
			conditions.push('(user_id = ? OR user_id IS NULL)');
			params.push(user_id);
		}
		if (filters.read !== undefined) {
			conditions.push('read = ?');
			params.push(filters.read ? 1 : 0);
		}
		if (filters.archived !== undefined) {
			// Override the default archived=0 filter
			conditions[1] = 'archived = ?';
			params.splice(1, 0, filters.archived ? 1 : 0);
		}

		const where = conditions.join(' AND ');
		const query = `SELECT * FROM notifications WHERE ${where} ORDER BY created_at DESC`;
		const countQuery = `SELECT COUNT(*) as total FROM notifications WHERE ${where}`;

		return this.paginate<Notification>(query, countQuery, page, perPage, ...params);
	}

	async countUnread(user_id?: string | null): Promise<number> {
		const conditions = ['account_id = ?', 'read = 0', 'archived = 0'];
		const params: unknown[] = [this.account_id];

		if (user_id !== undefined) {
			conditions.push('(user_id = ? OR user_id IS NULL)');
			params.push(user_id);
		}

		const row = await this.first<{ total: number }>(
			`SELECT COUNT(*) as total FROM notifications WHERE ${conditions.join(' AND ')}`,
			...params,
		);
		return row?.total ?? 0;
	}

	async create(data: {
		id: string;
		user_id?: string | null;
		type: string;
		title: string;
		body: string;
		severity?: string;
		link?: string;
	}): Promise<Notification> {
		await this.run(
			`INSERT INTO notifications (id, account_id, user_id, type, title, body, severity, link)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			data.id,
			this.account_id,
			data.user_id ?? null,
			data.type,
			data.title,
			data.body,
			data.severity ?? 'info',
			data.link ?? null,
		);
		const notification = await this.first<Notification>(
			'SELECT * FROM notifications WHERE id = ?',
			data.id,
		);
		if (!notification) throw new Error('Failed to create notification');
		return notification;
	}

	async markRead(id: string): Promise<void> {
		await this.run(
			'UPDATE notifications SET read = 1 WHERE id = ? AND account_id = ?',
			id,
			this.account_id,
		);
	}

	async markAllRead(user_id?: string | null): Promise<void> {
		if (user_id !== undefined) {
			await this.run(
				'UPDATE notifications SET read = 1 WHERE account_id = ? AND (user_id = ? OR user_id IS NULL)',
				this.account_id,
				user_id,
			);
		} else {
			await this.run('UPDATE notifications SET read = 1 WHERE account_id = ?', this.account_id);
		}
	}

	async archiveAll(user_id?: string | null): Promise<void> {
		if (user_id !== undefined) {
			await this.run(
				'UPDATE notifications SET archived = 1 WHERE account_id = ? AND (user_id = ? OR user_id IS NULL)',
				this.account_id,
				user_id,
			);
		} else {
			await this.run('UPDATE notifications SET archived = 1 WHERE account_id = ?', this.account_id);
		}
	}
}
