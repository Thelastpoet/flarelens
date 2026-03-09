import type { Baseline } from '@flarelens/shared';
import { BaseRepository } from '../repository.js';

export class BaselinesRepository extends BaseRepository {
	async findByResourceMetric(
		resource_id: string,
		metric: string,
		hour_of_day: number,
		day_of_week: number,
	): Promise<Baseline | null> {
		return this.first<Baseline>(
			'SELECT * FROM baselines WHERE account_id = ? AND resource_id = ? AND metric = ? AND hour_of_day = ? AND day_of_week = ?',
			this.account_id,
			resource_id,
			metric,
			hour_of_day,
			day_of_week,
		);
	}

	async upsert(data: {
		id: string;
		resource_id: string;
		metric: string;
		hour_of_day: number;
		day_of_week: number;
		avg_value: number;
		stddev_value: number;
		sample_count: number;
	}): Promise<void> {
		await this.run(
			`INSERT INTO baselines
       (id, account_id, resource_id, metric, hour_of_day, day_of_week,
        avg_value, stddev_value, sample_count, last_calculated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT (resource_id, metric, hour_of_day, day_of_week)
       DO UPDATE SET avg_value = excluded.avg_value, stddev_value = excluded.stddev_value,
         sample_count = excluded.sample_count, last_calculated = datetime('now'),
         updated_at = datetime('now')`,
			data.id,
			this.account_id,
			data.resource_id,
			data.metric,
			data.hour_of_day,
			data.day_of_week,
			data.avg_value,
			data.stddev_value,
			data.sample_count,
		);
	}

	async findAllForResource(resource_id: string): Promise<Baseline[]> {
		return this.all<Baseline>(
			'SELECT * FROM baselines WHERE account_id = ? AND resource_id = ?',
			this.account_id,
			resource_id,
		);
	}

	async recalculate(resource_id: string, metric: string): Promise<void> {
		// Mark baselines as stale by setting last_calculated to a past date,
		// so the next baseline-recalc cron picks them up.
		await this.run(
			`UPDATE baselines SET last_calculated = datetime('now', '-30 days')
       WHERE account_id = ? AND resource_id = ? AND metric = ?`,
			this.account_id,
			resource_id,
			metric,
		);
	}
}
