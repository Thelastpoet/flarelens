import type { Anomaly } from '@flarelens/shared';
import { BaseRepository } from '../repository.js';

export class AnomaliesRepository extends BaseRepository {
	async list(
		filters: {
			status?: string;
			severity?: string;
			resource_id?: string;
			page?: number;
			per_page?: number;
		} = {},
	): Promise<{
		data: Anomaly[];
		total: number;
		page: number;
		per_page: number;
		total_pages: number;
	}> {
		const page = filters.page ?? 1;
		const perPage = filters.per_page ?? 25;

		const conditions = ['account_id = ?'];
		const params: unknown[] = [this.account_id];

		if (filters.status) {
			conditions.push('status = ?');
			params.push(filters.status);
		}
		if (filters.severity) {
			conditions.push('severity = ?');
			params.push(filters.severity);
		}
		if (filters.resource_id) {
			conditions.push('resource_id = ?');
			params.push(filters.resource_id);
		}

		const where = conditions.join(' AND ');
		const query = `SELECT * FROM anomalies WHERE ${where} ORDER BY detected_at DESC`;
		const countQuery = `SELECT COUNT(*) as total FROM anomalies WHERE ${where}`;

		return this.paginate<Anomaly>(query, countQuery, page, perPage, ...params);
	}

	async findById(id: string): Promise<Anomaly | null> {
		return this.first<Anomaly>(
			'SELECT * FROM anomalies WHERE id = ? AND account_id = ?',
			id,
			this.account_id,
		);
	}

	async findByResource(resource_id: string, limit = 10): Promise<Anomaly[]> {
		return this.all<Anomaly>(
			'SELECT * FROM anomalies WHERE account_id = ? AND resource_id = ? ORDER BY detected_at DESC LIMIT ?',
			this.account_id,
			resource_id,
			limit,
		);
	}

	async create(data: {
		id: string;
		resource_id: string;
		rule_id?: string | null;
		detection_type: string;
		metric: string;
		severity: string;
		current_value: number;
		baseline_value?: number | null;
		deviation?: number | null;
		attribution?: unknown[];
	}): Promise<Anomaly> {
		await this.run(
			`INSERT INTO anomalies
       (id, account_id, resource_id, rule_id, detection_type, metric, severity,
        current_value, baseline_value, deviation, attribution)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			data.id,
			this.account_id,
			data.resource_id,
			data.rule_id ?? null,
			data.detection_type,
			data.metric,
			data.severity,
			data.current_value,
			data.baseline_value ?? null,
			data.deviation ?? null,
			JSON.stringify(data.attribution ?? []),
		);
		const anomaly = await this.findById(data.id);
		if (!anomaly) throw new Error('Failed to create anomaly');
		return anomaly;
	}

	async dismiss(id: string, dismissed_by: string): Promise<void> {
		await this.run(
			"UPDATE anomalies SET status = 'dismissed', dismissed_by = ? WHERE id = ? AND account_id = ?",
			dismissed_by,
			id,
			this.account_id,
		);
	}

	async resolve(id: string): Promise<void> {
		await this.run(
			"UPDATE anomalies SET status = 'resolved', resolved_at = datetime('now') WHERE id = ? AND account_id = ?",
			id,
			this.account_id,
		);
	}

	async countActive(): Promise<number> {
		const row = await this.first<{ total: number }>(
			"SELECT COUNT(*) as total FROM anomalies WHERE account_id = ? AND status = 'active'",
			this.account_id,
		);
		return row?.total ?? 0;
	}
}
