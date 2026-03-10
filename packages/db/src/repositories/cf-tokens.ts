import type { CfCapability, CfToken, CfTokenVerificationDetails } from '@flarelens/shared';
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

	async findVerifiedByAccount(requiredCapabilities: readonly CfCapability[] = []): Promise<CfToken[]> {
		const rows = await this.all<CfToken>(
			`SELECT * FROM cf_tokens
       WHERE account_id = ?
         AND status = 'active'
         AND cf_account_id IS NOT NULL
         AND verified_at IS NOT NULL`,
			this.account_id,
		);
		if (requiredCapabilities.length === 0) return rows;

		return rows.filter((row) => {
			const capabilities = JSON.parse(row.capabilities || '[]') as CfCapability[];
			return requiredCapabilities.every((capability) => capabilities.includes(capability));
		});
	}

	async create(data: {
		id: string;
		label: string;
		encrypted_token: string;
		cf_account_id?: string;
		permissions?: string[];
		capabilities?: CfCapability[];
		verification_details?: CfTokenVerificationDetails;
	}): Promise<CfToken> {
		await this.run(
			`INSERT INTO cf_tokens (
         id, account_id, label, encrypted_token, cf_account_id, permissions, capabilities, verification_details, status
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			data.id,
			this.account_id,
			data.label,
			data.encrypted_token,
			data.cf_account_id ?? null,
			JSON.stringify(data.permissions ?? []),
			JSON.stringify(data.capabilities ?? []),
			JSON.stringify(data.verification_details ?? {}),
			'pending',
		);
		const token = await this.findById(data.id);
		if (!token) throw new Error('Failed to create CF token');
		return { ...token, encrypted_token: '' };
	}

	async markVerified(data: {
		id: string;
		cf_account_id: string;
		permissions: string[];
		capabilities: CfCapability[];
		verification_details: CfTokenVerificationDetails;
	}): Promise<void> {
		await this.run(
			`UPDATE cf_tokens
       SET status = 'active',
           cf_account_id = ?,
           permissions = ?,
           capabilities = ?,
           verification_error = NULL,
           verification_details = ?,
           verified_at = datetime('now')
       WHERE id = ? AND account_id = ?`,
			data.cf_account_id,
			JSON.stringify(data.permissions),
			JSON.stringify(data.capabilities),
			JSON.stringify(data.verification_details),
			data.id,
			this.account_id,
		);
	}

	async updateStatus(data: {
		id: string;
		status: string;
		cf_account_id?: string | null;
		permissions?: string[];
		capabilities?: CfCapability[];
		verification_error?: string | null;
		verification_details?: CfTokenVerificationDetails;
	}): Promise<void> {
		await this.run(
			`UPDATE cf_tokens
       SET status = ?,
           cf_account_id = COALESCE(?, cf_account_id),
           permissions = COALESCE(?, permissions),
           capabilities = COALESCE(?, capabilities),
           verification_error = ?,
           verification_details = COALESCE(?, verification_details)
       WHERE id = ? AND account_id = ?`,
			data.status,
			data.cf_account_id ?? null,
			data.permissions ? JSON.stringify(data.permissions) : null,
			data.capabilities ? JSON.stringify(data.capabilities) : null,
			data.verification_error ?? null,
			data.verification_details ? JSON.stringify(data.verification_details) : null,
			data.id,
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
