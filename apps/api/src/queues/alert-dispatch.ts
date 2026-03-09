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
import { dispatchAlert } from '../services/alerts/dispatcher.js';

interface AlertDispatchMessage {
	anomaly_id: string;
	account_id: string;
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

export async function handleAlertDispatch(batch: MessageBatch, env: Env): Promise<void> {
	for (const message of batch.messages) {
		const { anomaly_id, account_id } = message.body as AlertDispatchMessage;
		try {
			const repos = buildRepos(env.DB, account_id);
			const anomaly = await repos.anomalies.findById(anomaly_id);

			if (!anomaly) {
				console.error(`[AlertDispatch] Anomaly ${anomaly_id} not found`);
				message.ack();
				continue;
			}

			await dispatchAlert(anomaly, repos, env);
			message.ack();
		} catch (err) {
			console.error('[AlertDispatch] Error:', err);
			message.retry();
		}
	}
}
