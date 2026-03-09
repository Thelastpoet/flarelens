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
import type { MiddlewareHandler } from 'hono';
import type { AppContext } from './auth.js';

export interface Repos {
	users: UsersRepository;
	accounts: AccountsRepository;
	teamMembers: TeamMembersRepository;
	cfTokens: CfTokensRepository;
	resources: ResourcesRepository;
	rules: RulesRepository;
	anomalies: AnomaliesRepository;
	notifications: NotificationsRepository;
	auditLogs: AuditLogsRepository;
	integrations: IntegrationsRepository;
	mitigations: MitigationsRepository;
	billingSnapshots: BillingSnapshotsRepository;
	developerTokens: DeveloperTokensRepository;
	zoneSnapshots: ZoneSnapshotsRepository;
	baselines: BaselinesRepository;
}

declare module 'hono' {
	interface ContextVariableMap {
		repos: Repos;
	}
}

export const reposMiddleware: MiddlewareHandler<AppContext> = async (c, next) => {
	// D1 binding is named DB in wrangler.jsonc
	const DB = (c.env as unknown as { DB: D1Database }).DB;
	const { account_id } = c.get('session');

	const repos: Repos = {
		users: new UsersRepository(DB, account_id),
		accounts: new AccountsRepository(DB, account_id),
		teamMembers: new TeamMembersRepository(DB, account_id),
		cfTokens: new CfTokensRepository(DB, account_id),
		resources: new ResourcesRepository(DB, account_id),
		rules: new RulesRepository(DB, account_id),
		anomalies: new AnomaliesRepository(DB, account_id),
		notifications: new NotificationsRepository(DB, account_id),
		auditLogs: new AuditLogsRepository(DB, account_id),
		integrations: new IntegrationsRepository(DB, account_id),
		mitigations: new MitigationsRepository(DB, account_id),
		billingSnapshots: new BillingSnapshotsRepository(DB, account_id),
		developerTokens: new DeveloperTokensRepository(DB, account_id),
		zoneSnapshots: new ZoneSnapshotsRepository(DB, account_id),
		baselines: new BaselinesRepository(DB, account_id),
	};

	c.set('repos', repos);
	await next();
};
