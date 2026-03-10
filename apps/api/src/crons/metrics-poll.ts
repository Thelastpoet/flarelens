import { CfTokensRepository, ResourcesRepository, ZoneSnapshotsRepository } from '@flarelens/db';
import { newId } from '@flarelens/shared';
import { decryptToken } from '../auth/crypto.js';
import type { Env } from '../env.js';
import { CloudflareClient } from '../services/cloudflare/client.js';
import { GqlQueries } from '../services/cloudflare/graphql.js';

const DETECTION_METRICS = [
	{ metric: 'requests', value: (bucket: { requests: number }) => bucket.requests },
	{ metric: 'bytes', value: (bucket: { bytes: number }) => bucket.bytes },
	{
		metric: 'cached_requests',
		value: (bucket: { cachedRequests: number }) => bucket.cachedRequests,
	},
	{ metric: 'threats', value: (bucket: { threats: number }) => bucket.threats },
] as const;

export async function runMetricsPoll(env: Env): Promise<void> {
	const DB = (env as unknown as { DB: D1Database }).DB;

	// Get all accounts
	const accountRows = await DB.prepare(
		"SELECT DISTINCT account_id FROM team_members WHERE status = 'active'",
	).all<{ account_id: string }>();

	for (const { account_id } of accountRows.results ?? []) {
		try {
			await pollAccount(account_id, DB, env);
		} catch (err) {
			console.error(`[MetricsPoll] Account ${account_id} failed:`, err);
		}
	}
}

async function pollAccount(accountId: string, DB: D1Database, env: Env): Promise<void> {
	const cfTokens = new CfTokensRepository(DB, accountId);
	const tokens = await cfTokens.findActiveByAccount();
	if (!tokens.length) return;

	const token = tokens[0];
	const plainToken = await decryptToken(token.encrypted_token, env.TOKEN_ENCRYPTION_KEY);
	const cfAccountId = token.cf_account_id ?? accountId;
	const client = new CloudflareClient(plainToken, cfAccountId);

	const resources = new ResourcesRepository(DB, accountId);
	const zoneSnapshots = new ZoneSnapshotsRepository(DB, accountId);
	const zones = await resources.list('zone');

	const toDate = new Date();
	const fromDate = new Date(toDate.getTime() - 5 * 60 * 1000); // last 5 minutes
	const to = toDate.toISOString();
	const from = fromDate.toISOString();

	for (const zone of zones) {
		if (zone.monitoring_status !== 'active') continue;
		try {
			const query = GqlQueries.zoneTrafficRecent(zone.cf_resource_id, from, to, 5);
			const data = await client.graphql(query.query, query.variables);
			const parsed = query.parseResponse(data);

			if (!parsed.buckets.length) continue;
			const latest = parsed.buckets[parsed.buckets.length - 1];

			const snapshotId = newId();
			await zoneSnapshots.upsert({
				id: snapshotId,
				resource_id: zone.id,
				timestamp: to,
				requests: latest.requests,
				cached_requests: latest.cachedRequests,
				bytes: latest.bytes,
				threats: latest.threats,
				page_views: latest.pageViews,
				unique_visitors: 0,
				estimated_cost: (latest.bytes / 1_073_741_824) * 0.0075,
				top_endpoints: [],
				top_countries: parsed.countryMap.slice(0, 10),
				top_user_agents: [],
			});

			for (const { metric, value } of DETECTION_METRICS) {
				await env.ANOMALY_CHECK_QUEUE.send({
					account_id: accountId,
					resource_id: zone.id,
					resource_type: 'zone',
					zone_id: zone.cf_resource_id,
					metric,
					current_value: value(latest),
					from,
					to,
				});
			}

			// Push to live feed DO
			try {
				const liveId = env.LIVE_FEED.idFromName(accountId);
				const stub = env.LIVE_FEED.get(liveId);
				await stub.fetch(
					new Request('https://internal/push', {
						method: 'POST',
						body: JSON.stringify({
							type: 'metrics',
							resource_id: zone.id,
							requests: latest.requests,
						}),
					}),
				);
			} catch {
				/* non-critical */
			}
		} catch (err) {
			console.error(`[MetricsPoll] Zone ${zone.id} poll failed:`, err);
		}
	}

	await cfTokens.markUsed(token.id);
}
