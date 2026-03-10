import { BaselinesRepository, ResourcesRepository, ZoneSnapshotsRepository } from '@flarelens/db';
import { newId } from '@flarelens/shared';
import type { Env } from '../env.js';

const BASELINE_METRICS = ['requests', 'bytes', 'cached_requests', 'threats'] as const;

export async function runBaselineRecalc(env: Env): Promise<void> {
	const DB = (env as unknown as { DB: D1Database }).DB;

	const accountRows = await DB.prepare(
		"SELECT DISTINCT account_id FROM team_members WHERE status = 'active'",
	).all<{ account_id: string }>();

	for (const { account_id } of accountRows.results ?? []) {
		try {
			await recalcAccount(account_id, DB);
		} catch (err) {
			console.error(`[BaselineRecalc] Account ${account_id} failed:`, err);
		}
	}
}

async function recalcAccount(accountId: string, DB: D1Database): Promise<void> {
	const resources = new ResourcesRepository(DB, accountId);
	const baselines = new BaselinesRepository(DB, accountId);
	const snapshots = new ZoneSnapshotsRepository(DB, accountId);

	const zones = await resources.list('zone');
	const cutoff = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();

	for (const zone of zones) {
		try {
			const allSnapshots = await snapshots.getTimeSeries(zone.id, cutoff, new Date().toISOString());
			if (allSnapshots.length < 10) continue; // Need sufficient data

			for (const metric of BASELINE_METRICS) {
				// Group by hour_of_day + day_of_week and compute avg/stddev per metric.
				const groups = new Map<string, number[]>();
				for (const snap of allSnapshots) {
					const d = new Date(snap.timestamp);
					const key = `${d.getUTCHours()}:${d.getUTCDay()}`;
					const arr = groups.get(key) ?? [];
					arr.push(snap[metric]);
					groups.set(key, arr);
				}

				for (const [key, values] of groups) {
					if (values.length < 3) continue;
					const [hourStr, dayStr] = key.split(':');
					const hour = parseInt(hourStr, 10);
					const day = parseInt(dayStr, 10);
					const avg = values.reduce((a, b) => a + b, 0) / values.length;
					const variance = values.reduce((a, b) => a + (b - avg) ** 2, 0) / values.length;
					const stddev = Math.sqrt(variance);

					await baselines.upsert({
						id: newId(),
						resource_id: zone.id,
						metric,
						hour_of_day: hour,
						day_of_week: day,
						avg_value: avg,
						stddev_value: stddev,
						sample_count: values.length,
					});
				}
			}
		} catch (err) {
			console.error(`[BaselineRecalc] Zone ${zone.id} failed:`, err);
		}
	}
}
