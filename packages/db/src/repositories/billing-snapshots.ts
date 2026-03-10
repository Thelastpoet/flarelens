import type { BillingSnapshot } from '@flarelens/shared';
import { BaseRepository } from '../repository.js';

export class BillingSnapshotsRepository extends BaseRepository {
	async getCurrent(): Promise<BillingSnapshot | null> {
		return this.first<BillingSnapshot>(
			"SELECT * FROM billing_snapshots WHERE account_id = ? AND status = 'active' ORDER BY period_start DESC LIMIT 1",
			this.account_id,
		);
	}

	async create(data: {
		id: string;
		period_start: string;
		period_end: string;
		total_cost: number;
		breakdown: Record<string, number>;
		budget_limit?: number | null;
	}): Promise<BillingSnapshot> {
		await this.run(
			`INSERT INTO billing_snapshots
       (id, account_id, period_start, period_end, total_cost, breakdown, budget_limit)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
			data.id,
			this.account_id,
			data.period_start,
			data.period_end,
			data.total_cost,
			JSON.stringify(data.breakdown),
			data.budget_limit ?? null,
		);
		const snapshot = await this.first<BillingSnapshot>(
			'SELECT * FROM billing_snapshots WHERE id = ?',
			data.id,
		);
		if (!snapshot) throw new Error('Failed to create billing snapshot');
		return snapshot;
	}

	async update(
		id: string,
		data: { total_cost?: number; breakdown?: Record<string, number>; budget_limit?: number | null },
	): Promise<void> {
		const sets: string[] = ["updated_at = datetime('now')"];
		const params: unknown[] = [];

		if (data.total_cost !== undefined) {
			sets.push('total_cost = ?');
			params.push(data.total_cost);
		}
		if (data.breakdown !== undefined) {
			sets.push('breakdown = ?');
			params.push(JSON.stringify(data.breakdown));
		}
		if (data.budget_limit !== undefined) {
			sets.push('budget_limit = ?');
			params.push(data.budget_limit);
		}

		params.push(id, this.account_id);
		await this.run(
			`UPDATE billing_snapshots SET ${sets.join(', ')} WHERE id = ? AND account_id = ?`,
			...params,
		);
	}

	async listInvoices(limit = 12): Promise<BillingSnapshot[]> {
		return this.all<BillingSnapshot>(
			"SELECT * FROM billing_snapshots WHERE account_id = ? AND status = 'invoice' ORDER BY period_start DESC LIMIT ?",
			this.account_id,
			limit,
		);
	}

	async getBudget(): Promise<number | null> {
		const account = await this.first<{ settings: string | null }>(
			'SELECT settings FROM accounts WHERE id = ?',
			this.account_id,
		);
		if (!account?.settings) return null;
		const settings = JSON.parse(account.settings) as Record<string, unknown>;
		return typeof settings.budget_limit === 'number' ? (settings.budget_limit as number) : null;
	}

	async setBudget(limit: number | null): Promise<void> {
		const account = await this.first<{ settings: string | null }>(
			'SELECT settings FROM accounts WHERE id = ?',
			this.account_id,
		);
		const settings = account?.settings
			? (JSON.parse(account.settings) as Record<string, unknown>)
			: {};
		const nextSettings = {
			...settings,
			budget_limit: limit,
		};
		await this.run(
			"UPDATE accounts SET settings = ?, updated_at = datetime('now') WHERE id = ?",
			JSON.stringify(nextSettings),
			this.account_id,
		);
	}

	async listCurrentPeriodEstimatedSnapshots(
		from: string,
		to: string,
	): Promise<Array<{ estimated_cost: number; timestamp: string }>> {
		return this.all<{ estimated_cost: number; timestamp: string }>(
			`SELECT estimated_cost, timestamp
       FROM zone_snapshots
       WHERE account_id = ? AND timestamp >= ? AND timestamp <= ?
       ORDER BY timestamp ASC`,
			this.account_id,
			from,
			to,
		);
	}
}
