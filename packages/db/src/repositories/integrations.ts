import type { Integration } from '@flarelens/shared';
import { BaseRepository } from '../repository.js';

export class IntegrationsRepository extends BaseRepository {
	async list(): Promise<Integration[]> {
		return this.all<Integration>(
			'SELECT * FROM integrations WHERE account_id = ? ORDER BY type ASC, created_at ASC',
			this.account_id,
		);
	}

	async listWebhooks(): Promise<Integration[]> {
		return this.all<Integration>(
			"SELECT * FROM integrations WHERE account_id = ? AND type = 'webhook' ORDER BY created_at ASC",
			this.account_id,
		);
	}

	async findByType(type: string): Promise<Integration | null> {
		return this.first<Integration>(
			"SELECT * FROM integrations WHERE account_id = ? AND type = ? AND type != 'webhook'",
			this.account_id,
			type,
		);
	}

	async findById(id: string): Promise<Integration | null> {
		return this.first<Integration>(
			'SELECT * FROM integrations WHERE id = ? AND account_id = ?',
			id,
			this.account_id,
		);
	}

	async create(data: {
		id: string;
		type: string;
		name: string;
		config: Record<string, unknown>;
	}): Promise<Integration> {
		await this.run(
			`INSERT INTO integrations (id, account_id, type, name, config)
       VALUES (?, ?, ?, ?, ?)`,
			data.id,
			this.account_id,
			data.type,
			data.name,
			JSON.stringify(data.config),
		);
		const integration = await this.findById(data.id);
		if (!integration) throw new Error('Failed to create integration');
		return integration;
	}

	async upsert(data: {
		id: string;
		type: string;
		name: string;
		config: Record<string, unknown>;
	}): Promise<Integration> {
		await this.run(
			`INSERT INTO integrations (id, account_id, type, name, config)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (account_id, type) WHERE type != 'webhook'
       DO UPDATE SET name = excluded.name, config = excluded.config,
         status = 'active', updated_at = datetime('now')`,
			data.id,
			this.account_id,
			data.type,
			data.name,
			JSON.stringify(data.config),
		);
		const integration = (await this.findByType(data.type)) ?? (await this.findById(data.id));
		if (!integration) throw new Error('Failed to upsert integration');
		return integration;
	}

	async update(
		id: string,
		data: { name?: string; config?: Record<string, unknown>; status?: string },
	): Promise<void> {
		const sets: string[] = ["updated_at = datetime('now')"];
		const params: unknown[] = [];

		if (data.name !== undefined) {
			sets.push('name = ?');
			params.push(data.name);
		}
		if (data.config !== undefined) {
			sets.push('config = ?');
			params.push(JSON.stringify(data.config));
		}
		if (data.status !== undefined) {
			sets.push('status = ?');
			params.push(data.status);
		}

		params.push(id, this.account_id);
		await this.run(
			`UPDATE integrations SET ${sets.join(', ')} WHERE id = ? AND account_id = ?`,
			...params,
		);
	}

	async delete(id: string): Promise<void> {
		await this.run('DELETE FROM integrations WHERE id = ? AND account_id = ?', id, this.account_id);
	}

	async markUsed(id: string): Promise<void> {
		await this.run(
			"UPDATE integrations SET last_used_at = datetime('now') WHERE id = ? AND account_id = ?",
			id,
			this.account_id,
		);
	}
}
