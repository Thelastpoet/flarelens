import type { CfToken } from '@flarelens/shared';
import { BaseRepository } from '../repository.js';

export class CfTokensRepository extends BaseRepository {
	/** List tokens with encrypted_token masked (empty string). */
	async list(): Promise<CfToken[]> {
		const rows = await this.all<CfToken>(
			"SELECT * FROM cf_tokens WHERE account_id = ? AND status != 'revoked' ORDER BY created_at DESC",
			this.account_id,
		);
		return rows.map((r) => ({ ...r, encrypted_token: '' }));
	}

	async findById(id: string): Promise<CfToken | null> {
		return this.first<CfToken>(
			'SELECT * FROM cf_tokens WHERE id = ? AND account_id = ?',
			id,
			this.account_id,
		);
	}

	/** Returns full tokens including encrypted_token for polling/decryption. */
	async findActiveByAccount(): Promise<CfToken[]> {
		return this.all<CfToken>(
			"SELECT * FROM cf_tokens WHERE account_id = ? AND status = 'active'",
			this.account_id,
		);
	}

	async create(data: {
		id: string;
		label: string;
		encrypted_token: string;
		cf_account_id?: string;
		permissions?: string[];
	}): Promise<CfToken> {
		await this.run(
			`INSERT INTO cf_tokens (id, account_id, label, encrypted_token, cf_account_id, permissions)
       VALUES (?, ?, ?, ?, ?, ?)`,
			data.id,
			this.account_id,
			data.label,
			data.encrypted_token,
			data.cf_account_id ?? null,
			JSON.stringify(data.permissions ?? []),
		);
		const token = await this.findById(data.id);
		if (!token) throw new Error('Failed to create CF token');
		return { ...token, encrypted_token: '' };
	}

	async markVerified(id: string, cf_account_id: string, permissions: string[]): Promise<void> {
		await this.run(
			`UPDATE cf_tokens
       SET status = 'active', cf_account_id = ?, permissions = ?, verified_at = datetime('now')
       WHERE id = ? AND account_id = ?`,
			cf_account_id,
			JSON.stringify(permissions),
			id,
			this.account_id,
		);
	}

	async updateStatus(
		id: string,
		status: string,
		cf_account_id?: string,
		permissions?: string[],
	): Promise<void> {
		await this.run(
			`UPDATE cf_tokens SET status = ?, cf_account_id = COALESCE(?, cf_account_id),
       permissions = COALESCE(?, permissions) WHERE id = ? AND account_id = ?`,
			status,
			cf_account_id ?? null,
			permissions ? JSON.stringify(permissions) : null,
			id,
			this.account_id,
		);
	}

	async markUsed(id: string): Promise<void> {
		await this.run(
			"UPDATE cf_tokens SET last_used_at = datetime('now') WHERE id = ? AND account_id = ?",
			id,
			this.account_id,
		);
	}

	async revoke(id: string): Promise<void> {
		await this.run(
			"UPDATE cf_tokens SET status = 'revoked' WHERE id = ? AND account_id = ?",
			id,
			this.account_id,
		);
	}
}
