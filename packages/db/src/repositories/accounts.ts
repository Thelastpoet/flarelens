import type { Account } from '@flarelens/shared';
import { BaseRepository } from '../repository.js';

export class AccountsRepository extends BaseRepository {
	async findById(): Promise<Account | null> {
		return this.first<Account>('SELECT * FROM accounts WHERE id = ?', this.account_id);
	}

	async create(data: { id: string; name: string; plan?: string }): Promise<Account> {
		await this.run(
			`INSERT INTO accounts (id, name, plan) VALUES (?, ?, ?)`,
			data.id,
			data.name,
			data.plan ?? 'free',
		);
		const account = await this.first<Account>('SELECT * FROM accounts WHERE id = ?', data.id);
		if (!account) throw new Error('Failed to create account');
		return account;
	}

	async updateSettings(settings: Record<string, unknown>): Promise<void> {
		await this.run(
			"UPDATE accounts SET settings = ?, updated_at = datetime('now') WHERE id = ?",
			JSON.stringify(settings),
			this.account_id,
		);
	}

	async updateProfile(data: { name?: string; settings?: Record<string, unknown> }): Promise<void> {
		const sets: string[] = ["updated_at = datetime('now')"];
		const params: unknown[] = [];

		if (data.name !== undefined) {
			sets.push('name = ?');
			params.push(data.name);
		}
		if (data.settings !== undefined) {
			sets.push('settings = ?');
			params.push(JSON.stringify(data.settings));
		}

		params.push(this.account_id);
		await this.run(`UPDATE accounts SET ${sets.join(', ')} WHERE id = ?`, ...params);
	}

	async updatePlan(plan: string, plan_period_end?: string): Promise<void> {
		await this.run(
			"UPDATE accounts SET plan = ?, plan_period_end = ?, updated_at = datetime('now') WHERE id = ?",
			plan,
			plan_period_end ?? null,
			this.account_id,
		);
	}
}
