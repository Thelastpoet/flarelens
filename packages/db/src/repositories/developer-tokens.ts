import type { DeveloperToken } from '@flarelens/shared';
import { BaseRepository } from '../repository.js';

export class DeveloperTokensRepository extends BaseRepository {
	async list(): Promise<DeveloperToken[]> {
		return this.all<DeveloperToken>(
			'SELECT * FROM developer_tokens WHERE account_id = ? ORDER BY created_at DESC',
			this.account_id,
		);
	}

	async findById(id: string): Promise<DeveloperToken | null> {
		return this.first<DeveloperToken>(
			'SELECT * FROM developer_tokens WHERE id = ? AND account_id = ?',
			id,
			this.account_id,
		);
	}

	/** Cross-account lookup used for API token authentication. */
	async findByHash(token_hash: string): Promise<DeveloperToken | null> {
		return this.first<DeveloperToken>(
			'SELECT * FROM developer_tokens WHERE token_hash = ?',
			token_hash,
		);
	}

	async create(data: {
		id: string;
		user_id: string;
		name: string;
		token_hash: string;
		token_prefix: string;
		expires_at?: string | null;
	}): Promise<DeveloperToken> {
		await this.run(
			`INSERT INTO developer_tokens
       (id, account_id, user_id, name, token_hash, token_prefix, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
			data.id,
			this.account_id,
			data.user_id,
			data.name,
			data.token_hash,
			data.token_prefix,
			data.expires_at ?? null,
		);
		const token = await this.findById(data.id);
		if (!token) throw new Error('Failed to create developer token');
		return token;
	}

	async revoke(id: string): Promise<void> {
		await this.run(
			'DELETE FROM developer_tokens WHERE id = ? AND account_id = ?',
			id,
			this.account_id,
		);
	}

	async markUsed(id: string): Promise<void> {
		await this.run("UPDATE developer_tokens SET last_used_at = datetime('now') WHERE id = ?", id);
	}
}
