import type { Env } from '../env.js';
import { PLAN_LIMITS } from '@flarelens/shared';

export async function runHousekeeping(env: Env): Promise<void> {
	const DB = (env as unknown as { DB: D1Database }).DB;

	const accountRows = await DB.prepare(
		"SELECT id, plan FROM accounts",
	).all<{ id: string; plan: string }>();

	for (const { id: accountId, plan } of accountRows.results ?? []) {
		try {
			const retentionDays = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]?.data_retention_days ?? 7;
			const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

			// Delete old zone snapshots beyond retention
			await DB.prepare(
				'DELETE FROM zone_snapshots WHERE account_id = ? AND timestamp < ?',
			).bind(accountId, cutoff).run();

			// Purge soft-deleted rules > 30 days
			const rulesCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
			await DB.prepare(
				'DELETE FROM rules WHERE account_id = ? AND deleted_at IS NOT NULL AND deleted_at < ?',
			).bind(accountId, rulesCutoff).run();

			// Archive old read notifications > retention
			await DB.prepare(
				"UPDATE notifications SET archived = 1 WHERE account_id = ? AND read = 1 AND created_at < ?",
			).bind(accountId, cutoff).run();

			console.log(`[Housekeeping] Account ${accountId}: cleaned up data older than ${retentionDays} days`);
		} catch (err) {
			console.error(`[Housekeeping] Account ${accountId} failed:`, err);
		}
	}
}
