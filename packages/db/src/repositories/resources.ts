import type { Resource } from '@flarelens/shared';
import { BaseRepository } from '../repository.js';

export class ResourcesRepository extends BaseRepository {
	async list(type?: string): Promise<Resource[]> {
		if (type) {
			return this.all<Resource>(
				'SELECT * FROM resources WHERE account_id = ? AND type = ? ORDER BY name ASC',
				this.account_id,
				type,
			);
		}
		return this.all<Resource>(
			'SELECT * FROM resources WHERE account_id = ? ORDER BY type ASC, name ASC',
			this.account_id,
		);
	}

	async findById(id: string): Promise<Resource | null> {
		return this.first<Resource>(
			'SELECT * FROM resources WHERE id = ? AND account_id = ?',
			id,
			this.account_id,
		);
	}

	async findByCfResourceId(cf_resource_id: string): Promise<Resource | null> {
		return this.first<Resource>(
			'SELECT * FROM resources WHERE account_id = ? AND cf_resource_id = ?',
			this.account_id,
			cf_resource_id,
		);
	}

	async create(data: {
		id: string;
		cf_token_id: string;
		cf_resource_id: string;
		type: string;
		name: string;
		metadata?: Record<string, unknown>;
	}): Promise<Resource> {
		await this.run(
			`INSERT INTO resources (id, account_id, cf_token_id, cf_resource_id, type, name, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
			data.id,
			this.account_id,
			data.cf_token_id,
			data.cf_resource_id,
			data.type,
			data.name,
			JSON.stringify(data.metadata ?? {}),
		);
		const resource = await this.findById(data.id);
		if (!resource) throw new Error('Failed to create resource');
		return resource;
	}

	async update(
		id: string,
		data: {
			monitoring_status?: string;
			metadata?: Record<string, unknown>;
			last_synced_at?: string;
		},
	): Promise<void> {
		const sets: string[] = ["updated_at = datetime('now')"];
		const params: unknown[] = [];

		if (data.monitoring_status !== undefined) {
			sets.push('monitoring_status = ?');
			params.push(data.monitoring_status);
		}
		if (data.metadata !== undefined) {
			sets.push('metadata = ?');
			params.push(JSON.stringify(data.metadata));
		}
		if (data.last_synced_at !== undefined) {
			sets.push('last_synced_at = ?');
			params.push(data.last_synced_at);
		}

		params.push(id, this.account_id);
		await this.run(
			`UPDATE resources SET ${sets.join(', ')} WHERE id = ? AND account_id = ?`,
			...params,
		);
	}

	async delete(id: string): Promise<void> {
		await this.run('DELETE FROM resources WHERE id = ? AND account_id = ?', id, this.account_id);
	}

	async upsertFromCF(data: {
		id: string;
		cf_token_id: string;
		cf_resource_id: string;
		type: string;
		name: string;
		metadata?: Record<string, unknown>;
	}): Promise<Resource> {
		await this.run(
			`INSERT INTO resources (id, account_id, cf_token_id, cf_resource_id, type, name, metadata, last_synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT (account_id, cf_resource_id)
       DO UPDATE SET name = excluded.name, metadata = excluded.metadata,
         last_synced_at = datetime('now'), updated_at = datetime('now')`,
			data.id,
			this.account_id,
			data.cf_token_id,
			data.cf_resource_id,
			data.type,
			data.name,
			JSON.stringify(data.metadata ?? {}),
		);
		const resource = await this.findByCfResourceId(data.cf_resource_id);
		if (!resource) throw new Error('Failed to upsert resource');
		return resource;
	}

	async count(): Promise<number> {
		const row = await this.first<{ total: number }>(
			'SELECT COUNT(*) as total FROM resources WHERE account_id = ?',
			this.account_id,
		);
		return row?.total ?? 0;
	}
}
