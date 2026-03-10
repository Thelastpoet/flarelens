import {
	AccountsRepository,
	AnomaliesRepository,
	AuditLogsRepository,
	BaselinesRepository,
	BillingSnapshotsRepository,
	CfTokensRepository,
	DeveloperTokensRepository,
	IntegrationsRepository,
	MitigationsRepository,
	NotificationsRepository,
	ResourcesRepository,
	RulesRepository,
	TeamMembersRepository,
	UsersRepository,
	ZoneSnapshotsRepository,
} from '@flarelens/db';
import type { Repos } from '../middleware/repos.js';
import type { Env } from '../env.js';
import { runDetection } from '../services/detection/index.js';

interface AnomalyCheckMessage {
	account_id: string;
	resource_id: string;
	resource_type: string;
	zone_id?: string;
	metric: string;
	current_value: number;
	from: string;
	to: string;
}

function getMetricValue(
	metric: string,
	snapshot: {
		requests: number;
		bytes: number;
		cached_requests: number;
		threats: number;
	},
): number {
	switch (metric) {
		case 'requests':
			return snapshot.requests;
		case 'bytes':
			return snapshot.bytes;
		case 'cached_requests':
			return snapshot.cached_requests;
		case 'threats':
			return snapshot.threats;
		default:
			return snapshot.requests;
	}
}

function buildRepos(db: D1Database, accountId: string): Repos {
	return {
		users: new UsersRepository(db, accountId),
		accounts: new AccountsRepository(db, accountId),
		teamMembers: new TeamMembersRepository(db, accountId),
		cfTokens: new CfTokensRepository(db, accountId),
		resources: new ResourcesRepository(db, accountId),
		rules: new RulesRepository(db, accountId),
		anomalies: new AnomaliesRepository(db, accountId),
		notifications: new NotificationsRepository(db, accountId),
		auditLogs: new AuditLogsRepository(db, accountId),
		integrations: new IntegrationsRepository(db, accountId),
		mitigations: new MitigationsRepository(db, accountId),
		billingSnapshots: new BillingSnapshotsRepository(db, accountId),
		developerTokens: new DeveloperTokensRepository(db, accountId),
		zoneSnapshots: new ZoneSnapshotsRepository(db, accountId),
		baselines: new BaselinesRepository(db, accountId),
	};
}

export async function handleAnomalyCheck(batch: MessageBatch, env: Env): Promise<void> {
	const DB = (env as unknown as { DB: D1Database }).DB;

	for (const message of batch.messages) {
		const msg = message.body as AnomalyCheckMessage;
		try {
			const repos = buildRepos(DB, msg.account_id);

			// Fetch recent values for velocity detection (last 5 snapshots)
			const recentSnapshots = await repos.zoneSnapshots.getTimeSeries(
				msg.resource_id,
				new Date(Date.now() - 30 * 60 * 1000).toISOString(), // last 30 min
				msg.to,
			);
			const recentValues = recentSnapshots
				.map((snapshot) => getMetricValue(msg.metric, snapshot))
				.slice(-5);

			await runDetection(
				{
					accountId: msg.account_id,
					resourceId: msg.resource_id,
					resourceType: msg.resource_type,
					zoneId: msg.zone_id,
					metric: msg.metric,
					currentValue: msg.current_value,
					recentValues,
					from: new Date(msg.from),
					to: new Date(msg.to),
				},
				repos,
				env,
			);

			message.ack();
		} catch (err) {
			console.error('[AnomalyCheck] Error:', err);
			message.retry();
		}
	}
}
