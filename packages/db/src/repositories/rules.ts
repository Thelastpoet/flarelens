import type { Rule } from '@flarelens/shared';
import { BaseRepository } from '../repository.js';

export class RulesRepository extends BaseRepository {
	async list(): Promise<Rule[]> {
		return this.all<Rule>(
			'SELECT * FROM rules WHERE account_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
			this.account_id,
		);
	}

	async findById(id: string): Promise<Rule | null> {
		return this.first<Rule>(
			'SELECT * FROM rules WHERE id = ? AND account_id = ? AND deleted_at IS NULL',
			id,
			this.account_id,
		);
	}

	async findEnabledByAccount(): Promise<Rule[]> {
		return this.all<Rule>(
			'SELECT * FROM rules WHERE account_id = ? AND enabled = 1 AND deleted_at IS NULL',
			this.account_id,
		);
	}

	async create(data: {
		id: string;
		name: string;
		resource_type: string;
		resource_id?: string | null;
		metric: string;
		operator: string;
		threshold: number;
		window: string;
		severity: string;
		notify_frequency: string;
		created_by: string;
	}): Promise<Rule> {
		await this.run(
			`INSERT INTO rules
       (id, account_id, name, resource_type, resource_id, metric, operator, threshold,
        window, severity, notify_frequency, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			data.id,
			this.account_id,
			data.name,
			data.resource_type,
			data.resource_id ?? null,
			data.metric,
			data.operator,
			data.threshold,
			data.window,
			data.severity,
			data.notify_frequency,
			data.created_by,
		);
		const rule = await this.findById(data.id);
		if (!rule) throw new Error('Failed to create rule');
		return rule;
	}

	async update(
		id: string,
		data: Partial<{
			name: string;
			threshold: number;
			operator: string;
			window: string;
			severity: string;
			notify_frequency: string;
			resource_id: string | null;
		}>,
	): Promise<void> {
		const sets: string[] = ["updated_at = datetime('now')"];
		const params: unknown[] = [];

		for (const [key, value] of Object.entries(data)) {
			if (value !== undefined) {
				sets.push(`${key} = ?`);
				params.push(value);
			}
		}

		params.push(id, this.account_id);
		await this.run(
			`UPDATE rules SET ${sets.join(', ')} WHERE id = ? AND account_id = ? AND deleted_at IS NULL`,
			...params,
		);
	}

	async toggle(id: string, enabled: boolean): Promise<void> {
		await this.run(
			"UPDATE rules SET enabled = ?, updated_at = datetime('now') WHERE id = ? AND account_id = ? AND deleted_at IS NULL",
			enabled ? 1 : 0,
			id,
			this.account_id,
		);
	}

	async delete(id: string): Promise<void> {
		await this.run(
			"UPDATE rules SET deleted_at = datetime('now') WHERE id = ? AND account_id = ?",
			id,
			this.account_id,
		);
	}

	async count(): Promise<number> {
		const row = await this.first<{ total: number }>(
			'SELECT COUNT(*) as total FROM rules WHERE account_id = ? AND deleted_at IS NULL',
			this.account_id,
		);
		return row?.total ?? 0;
	}
}
