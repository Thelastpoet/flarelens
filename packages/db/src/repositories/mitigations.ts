import type { Mitigation } from '@flarelens/shared';
import { BaseRepository } from '../repository.js';

export class MitigationsRepository extends BaseRepository {
	async list(): Promise<Mitigation[]> {
		return this.all<Mitigation>(
			'SELECT * FROM mitigations WHERE account_id = ? ORDER BY created_at DESC',
			this.account_id,
		);
	}

	async findById(id: string): Promise<Mitigation | null> {
		return this.first<Mitigation>(
			'SELECT * FROM mitigations WHERE id = ? AND account_id = ?',
			id,
			this.account_id,
		);
	}

	async findTriggerable(): Promise<Mitigation[]> {
		return this.all<Mitigation>(
			'SELECT * FROM mitigations WHERE account_id = ? AND enabled = 1',
			this.account_id,
		);
	}

	async create(data: {
		id: string;
		name: string;
		trigger_type: string;
		trigger_condition: Record<string, unknown>;
		action_type: string;
		action_config: Record<string, unknown>;
		resource_id?: string | null;
		created_by: string;
	}): Promise<Mitigation> {
		await this.run(
			`INSERT INTO mitigations
       (id, account_id, name, trigger_type, trigger_condition, action_type, action_config, resource_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			data.id,
			this.account_id,
			data.name,
			data.trigger_type,
			JSON.stringify(data.trigger_condition),
			data.action_type,
			JSON.stringify(data.action_config),
			data.resource_id ?? null,
			data.created_by,
		);
		const mitigation = await this.findById(data.id);
		if (!mitigation) throw new Error('Failed to create mitigation');
		return mitigation;
	}

	async update(
		id: string,
		data: Partial<{
			name: string;
			trigger_condition: Record<string, unknown>;
			action_config: Record<string, unknown>;
			resource_id: string | null;
		}>,
	): Promise<void> {
		const sets: string[] = ["updated_at = datetime('now')"];
		const params: unknown[] = [];

		if (data.name !== undefined) {
			sets.push('name = ?');
			params.push(data.name);
		}
		if (data.trigger_condition !== undefined) {
			sets.push('trigger_condition = ?');
			params.push(JSON.stringify(data.trigger_condition));
		}
		if (data.action_config !== undefined) {
			sets.push('action_config = ?');
			params.push(JSON.stringify(data.action_config));
		}
		if (data.resource_id !== undefined) {
			sets.push('resource_id = ?');
			params.push(data.resource_id);
		}

		params.push(id, this.account_id);
		await this.run(
			`UPDATE mitigations SET ${sets.join(', ')} WHERE id = ? AND account_id = ?`,
			...params,
		);
	}

	async toggle(id: string, enabled: boolean): Promise<void> {
		await this.run(
			"UPDATE mitigations SET enabled = ?, updated_at = datetime('now') WHERE id = ? AND account_id = ?",
			enabled ? 1 : 0,
			id,
			this.account_id,
		);
	}

	async recordTrigger(id: string, savings = 0): Promise<void> {
		await this.run(
			`UPDATE mitigations
       SET last_triggered = datetime('now'),
           trigger_count = trigger_count + 1,
           estimated_savings = estimated_savings + ?,
           updated_at = datetime('now')
       WHERE id = ? AND account_id = ?`,
			savings,
			id,
			this.account_id,
		);
	}

	async delete(id: string): Promise<void> {
		await this.run('DELETE FROM mitigations WHERE id = ? AND account_id = ?', id, this.account_id);
	}
}
