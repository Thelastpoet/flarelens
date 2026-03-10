import type {
	Account,
	Anomaly,
	Baseline,
	CfToken,
	DeveloperToken,
	Mitigation,
	Notification,
	Resource,
	Rule,
	TeamMember,
	User,
} from '@flarelens/shared';
import type { Env } from '../../src/env.js';

type AuditLogRecord = {
	id: string;
	account_id: string;
	user_id: string | null;
	user_email: string | null;
	action: string;
	entity_type: string;
	entity_id: string | null;
	description: string;
	ip_address: string | null;
	user_agent: string | null;
	metadata: string;
};

type CfTokenRecord = CfToken;
type BillingSnapshotRecord = {
	id: string;
	account_id: string;
	period_start: string;
	period_end: string;
	total_cost: number;
	breakdown: string;
	budget_limit: number | null;
	status: 'active' | 'invoice';
	stripe_invoice_id: string | null;
	created_at: string;
	updated_at: string;
};
type ZoneSnapshotRecord = {
	id: string;
	account_id: string;
	resource_id: string;
	timestamp: string;
	requests: number;
	cached_requests: number;
	bytes: number;
	threats: number;
	page_views: number;
	unique_visitors: number;
	estimated_cost: number;
	top_endpoints: string;
	top_countries: string;
	top_user_agents: string;
	created_at: string;
};
type ResourceRecord = Resource;
type BaselineRecord = Baseline;
type RuleRecord = Rule;
type AnomalyRecord = Anomaly;
type NotificationRecord = Notification;
type DeveloperTokenRecord = DeveloperToken;

function normalizeSql(query: string): string {
	return query.replace(/\s+/g, ' ').trim();
}

export class FakeKVNamespace implements KVNamespace {
	private readonly store = new Map<string, { value: string; expiresAt: number | null }>();

	async get(key: string): Promise<string | null> {
		const entry = this.store.get(key);
		if (!entry) return null;
		if (entry.expiresAt && entry.expiresAt <= Date.now()) {
			this.store.delete(key);
			return null;
		}
		return entry.value;
	}

	async put(key: string, value: string, options?: KVNamespacePutOptions): Promise<void> {
		const expiresAt = options?.expirationTtl
			? Date.now() + options.expirationTtl * 1000
			: null;
		this.store.set(key, { value, expiresAt });
	}

	async delete(key: string): Promise<void> {
		this.store.delete(key);
	}

	async list(): Promise<KVNamespaceListResult<unknown>> {
		return { keys: [], list_complete: true, cacheStatus: null };
	}

	async getWithMetadata(): Promise<KVNamespaceGetWithMetadataResult<unknown>> {
		throw new Error('Not implemented in FakeKVNamespace');
	}
}

class FakePreparedStatement {
	constructor(
		private readonly db: FakeD1Database,
		private readonly query: string,
		private readonly params: unknown[] = [],
	) {}

	bind(...params: unknown[]) {
		return new FakePreparedStatement(this.db, this.query, params);
	}

	async first<T>(): Promise<T | null> {
		return this.db.executeFirst<T>(this.query, this.params);
	}

	async all<T>(): Promise<{ results: T[] }> {
		return { results: await this.db.executeAll<T>(this.query, this.params) };
	}

	async run(): Promise<D1Result> {
		return this.db.executeRun(this.query, this.params);
	}
}

export class FakeD1Database implements D1Database {
	accounts = new Map<string, Account>();
	users = new Map<string, User>();
	usersByEmail = new Map<string, User>();
	teamMembers = new Map<string, TeamMember>();
	cfTokens = new Map<string, CfTokenRecord>();
	resources = new Map<string, ResourceRecord>();
	baselines = new Map<string, BaselineRecord>();
	rules = new Map<string, RuleRecord>();
	anomalies = new Map<string, AnomalyRecord>();
	notifications = new Map<string, NotificationRecord>();
	developerTokens = new Map<string, DeveloperTokenRecord>();
	mitigations = new Map<string, Mitigation>();
	billingSnapshots = new Map<string, BillingSnapshotRecord>();
	zoneSnapshots = new Map<string, ZoneSnapshotRecord>();
	auditLogs: AuditLogRecord[] = [];

	prepare(query: string): D1PreparedStatement {
		return new FakePreparedStatement(this, query) as unknown as D1PreparedStatement;
	}

	batch(): Promise<D1Result[]> {
		throw new Error('Not implemented in FakeD1Database');
	}

	dump(): Promise<ArrayBuffer> {
		throw new Error('Not implemented in FakeD1Database');
	}

	exec(): Promise<D1ExecResult> {
		throw new Error('Not implemented in FakeD1Database');
	}

	async executeFirst<T>(query: string, params: unknown[]): Promise<T | null> {
		const sql = normalizeSql(query);

		if (sql === 'SELECT * FROM users WHERE email = ?') {
			return (this.usersByEmail.get(String(params[0])) ?? null) as T | null;
		}

		if (sql === 'SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?') {
			return (
				[...this.users.values()].find(
					(user) => user.oauth_provider === params[0] && user.oauth_id === params[1],
				) ?? null
			) as T | null;
		}

		if (sql === 'SELECT * FROM users WHERE id = ?') {
			return (this.users.get(String(params[0])) ?? null) as T | null;
		}

		if (sql === 'SELECT * FROM accounts WHERE id = ?') {
			return (this.accounts.get(String(params[0])) ?? null) as T | null;
		}

		if (sql === 'SELECT settings FROM accounts WHERE id = ?') {
			const account = this.accounts.get(String(params[0]));
			return account ? ({ settings: account.settings } as T) : null;
		}

		if (
			sql ===
			"SELECT account_id, role FROM team_members WHERE user_id = ? AND status = 'active' ORDER BY CASE role WHEN 'admin' THEN 0 WHEN 'editor' THEN 1 ELSE 2 END LIMIT 1"
		) {
			const membership = [...this.teamMembers.values()].find(
				(member) => member.user_id === params[0] && member.status === 'active',
			);
			if (!membership) return null;
			return { account_id: membership.account_id, role: membership.role } as T;
		}

		if (sql === 'SELECT * FROM team_members WHERE account_id = ? AND user_id = ?') {
			return (
				[...this.teamMembers.values()].find(
					(member) =>
						member.account_id === params[0] && member.user_id === params[1],
				) ?? null
			) as T | null;
		}

		if (sql === 'SELECT * FROM team_members WHERE account_id = ? AND email = ?') {
			return (
				[...this.teamMembers.values()].find(
					(member) => member.account_id === params[0] && member.email === params[1],
				) ?? null
			) as T | null;
		}

		if (sql === 'SELECT * FROM team_members WHERE id = ?') {
			return (this.teamMembers.get(String(params[0])) ?? null) as T | null;
		}

		if (sql === 'SELECT * FROM team_members WHERE id = ? AND account_id = ?') {
			const member = this.teamMembers.get(String(params[0]));
			if (!member || member.account_id !== params[1]) return null;
			return member as T;
		}

		if (sql === 'SELECT * FROM mitigations WHERE id = ? AND account_id = ?') {
			const mitigation = this.mitigations.get(String(params[0]));
			if (!mitigation || mitigation.account_id !== params[1]) return null;
			return mitigation as T;
		}

		if (sql === 'SELECT * FROM developer_tokens WHERE id = ? AND account_id = ?') {
			const token = this.developerTokens.get(String(params[0]));
			if (!token || token.account_id !== params[1]) return null;
			return token as T;
		}

		if (sql === 'SELECT * FROM cf_tokens WHERE id = ? AND account_id = ?') {
			const token = this.cfTokens.get(String(params[0]));
			if (!token || token.account_id !== params[1]) return null;
			return token as T;
		}

		if (
			sql ===
			"SELECT * FROM billing_snapshots WHERE account_id = ? AND status = 'active' ORDER BY period_start DESC LIMIT 1"
		) {
			return (
				[...this.billingSnapshots.values()]
					.filter((snapshot) => snapshot.account_id === params[0] && snapshot.status === 'active')
					.sort((a, b) => b.period_start.localeCompare(a.period_start))[0] ?? null
			) as T | null;
		}

		if (sql === 'SELECT * FROM resources WHERE id = ? AND account_id = ?') {
			const resource = this.resources.get(String(params[0]));
			if (!resource || resource.account_id !== params[1]) return null;
			return resource as T;
		}

		if (sql === 'SELECT * FROM resources WHERE account_id = ? AND cf_resource_id = ? AND type = ?') {
			return (
				[...this.resources.values()].find(
					(resource) =>
						resource.account_id === params[0] &&
						resource.cf_resource_id === params[1] &&
						resource.type === params[2],
				) ?? null
			) as T | null;
		}

		if (
			sql ===
			'SELECT * FROM baselines WHERE account_id = ? AND resource_id = ? AND metric = ? AND hour_of_day = ? AND day_of_week = ?'
		) {
			return (
				[...this.baselines.values()].find(
					(baseline) =>
						baseline.account_id === params[0] &&
						baseline.resource_id === params[1] &&
						baseline.metric === params[2] &&
						baseline.hour_of_day === params[3] &&
						baseline.day_of_week === params[4],
				) ?? null
			) as T | null;
		}

		if (sql === 'SELECT * FROM anomalies WHERE id = ? AND account_id = ?') {
			const anomaly = this.anomalies.get(String(params[0]));
			if (!anomaly || anomaly.account_id !== params[1]) return null;
			return anomaly as T;
		}

		if (sql === 'SELECT * FROM notifications WHERE id = ?') {
			return (this.notifications.get(String(params[0])) ?? null) as T | null;
		}

		if (
			sql ===
			'SELECT * FROM notifications WHERE id = ? AND account_id = ? AND (user_id = ? OR user_id IS NULL)'
		) {
			const notification = this.notifications.get(String(params[0]));
			if (!notification || notification.account_id !== params[1]) return null;
			if (notification.user_id !== null && notification.user_id !== params[2]) return null;
			return notification as T;
		}

		if (sql === "SELECT COUNT(*) as total FROM anomalies WHERE account_id = ? AND status = 'active'") {
			const total = [...this.anomalies.values()].filter(
				(anomaly) => anomaly.account_id === params[0] && anomaly.status === 'active',
			).length;
			return { total } as T;
		}

		if (
			sql ===
			'SELECT COUNT(*) as total FROM notifications WHERE account_id = ? AND archived = 0 AND (user_id = ? OR user_id IS NULL)'
		) {
			const total = [...this.notifications.values()].filter(
				(notification) =>
					notification.account_id === params[0] &&
					notification.archived === 0 &&
					(notification.user_id === params[1] || notification.user_id === null),
			).length;
			return { total } as T;
		}

		if (
			sql ===
			"SELECT COUNT(*) as total FROM team_members WHERE account_id = ? AND status = 'active'"
		) {
			const total = [...this.teamMembers.values()].filter(
				(member) => member.account_id === params[0] && member.status === 'active',
			).length;
			return { total } as T;
		}

		throw new Error(`Unsupported first() query in FakeD1Database: ${sql}`);
	}

	async executeAll<T>(query: string, params: unknown[]): Promise<T[]> {
		const sql = normalizeSql(query);

		if (sql === "SELECT * FROM cf_tokens WHERE account_id = ? AND status = 'active'") {
			return [...this.cfTokens.values()].filter(
				(token) => token.account_id === params[0] && token.status === 'active',
			) as T[];
		}

		if (
			sql ===
			`SELECT * FROM cf_tokens WHERE account_id = ? AND status = 'active' AND cf_account_id IS NOT NULL AND verified_at IS NOT NULL`
		) {
			return [...this.cfTokens.values()].filter(
				(token) =>
					token.account_id === params[0] &&
					token.status === 'active' &&
					token.cf_account_id !== null &&
					token.verified_at !== null,
			) as T[];
		}

		if (sql === 'SELECT * FROM mitigations WHERE account_id = ? ORDER BY created_at DESC') {
			return [...this.mitigations.values()]
				.filter((mitigation) => mitigation.account_id === params[0])
				.sort((a, b) => b.created_at.localeCompare(a.created_at)) as T[];
		}

		if (sql === 'SELECT * FROM developer_tokens WHERE account_id = ? ORDER BY created_at DESC') {
			return [...this.developerTokens.values()]
				.filter((token) => token.account_id === params[0])
				.sort((a, b) => b.created_at.localeCompare(a.created_at)) as T[];
		}

		if (sql === 'SELECT * FROM mitigations WHERE account_id = ? AND enabled = 1') {
			return [...this.mitigations.values()].filter(
				(mitigation) => mitigation.account_id === params[0] && mitigation.enabled === 1,
			) as T[];
		}

		if (
			sql ===
			"SELECT * FROM billing_snapshots WHERE account_id = ? AND status = 'invoice' ORDER BY period_start DESC LIMIT ?"
		) {
			return [...this.billingSnapshots.values()]
				.filter((snapshot) => snapshot.account_id === params[0] && snapshot.status === 'invoice')
				.sort((a, b) => b.period_start.localeCompare(a.period_start))
				.slice(0, Number(params[1])) as T[];
		}

		if (
			sql ===
			'SELECT estimated_cost, timestamp FROM zone_snapshots WHERE account_id = ? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC'
		) {
			return [...this.zoneSnapshots.values()]
				.filter(
					(snapshot) =>
						snapshot.account_id === params[0] &&
						snapshot.timestamp >= params[1] &&
						snapshot.timestamp <= params[2],
				)
				.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
				.map((snapshot) => ({
					estimated_cost: snapshot.estimated_cost,
					timestamp: snapshot.timestamp,
				})) as T[];
		}

		if (sql === 'SELECT * FROM resources WHERE account_id = ? AND type = ? ORDER BY name ASC') {
			return [...this.resources.values()]
				.filter((resource) => resource.account_id === params[0] && resource.type === params[1])
				.sort((a, b) => a.name.localeCompare(b.name)) as T[];
		}

		if (
			sql ===
			'SELECT * FROM zone_snapshots WHERE account_id = ? AND resource_id = ? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC'
		) {
			return [...this.zoneSnapshots.values()]
				.filter(
					(snapshot) =>
						snapshot.account_id === params[0] &&
						snapshot.resource_id === params[1] &&
						snapshot.timestamp >= params[2] &&
						snapshot.timestamp <= params[3],
				)
				.sort((a, b) => a.timestamp.localeCompare(b.timestamp)) as T[];
		}

		if (
			sql ===
			'SELECT * FROM rules WHERE account_id = ? AND enabled = 1 AND deleted_at IS NULL'
		) {
			return [...this.rules.values()].filter(
				(rule) => rule.account_id === params[0] && rule.enabled === 1 && rule.deleted_at === null,
			) as T[];
		}

		if (
			sql ===
			'SELECT * FROM anomalies WHERE account_id = ? AND resource_id = ? ORDER BY detected_at DESC LIMIT ?'
		) {
			return [...this.anomalies.values()]
				.filter((anomaly) => anomaly.account_id === params[0] && anomaly.resource_id === params[1])
				.sort((a, b) => b.detected_at.localeCompare(a.detected_at))
				.slice(0, Number(params[2])) as T[];
		}

		if (sql === 'SELECT * FROM team_members WHERE account_id = ? ORDER BY created_at ASC') {
			return [...this.teamMembers.values()]
				.filter((member) => member.account_id === params[0])
				.sort((a, b) => a.created_at.localeCompare(b.created_at)) as T[];
		}

		if (sql === 'SELECT * FROM team_members WHERE account_id = ? AND email = ?') {
			return (
				[...this.teamMembers.values()].find(
					(member) => member.account_id === params[0] && member.email === params[1],
				) ? [ [...this.teamMembers.values()].find(
					(member) => member.account_id === params[0] && member.email === params[1],
				)! ] : []
			) as T[];
		}

		if (
			sql ===
			'SELECT * FROM notifications WHERE account_id = ? AND archived = 0 AND (user_id = ? OR user_id IS NULL) ORDER BY created_at DESC LIMIT ? OFFSET ?'
		) {
			return [...this.notifications.values()]
				.filter(
					(notification) =>
						notification.account_id === params[0] &&
						notification.archived === 0 &&
						(notification.user_id === params[1] || notification.user_id === null),
				)
				.sort((a, b) => b.created_at.localeCompare(a.created_at))
				.slice(Number(params[3]), Number(params[3]) + Number(params[2])) as T[];
		}

		if (
			sql ===
			'SELECT COUNT(*) as total FROM notifications WHERE account_id = ? AND archived = 0 AND (user_id = ? OR user_id IS NULL)'
		) {
			const total = [...this.notifications.values()].filter(
				(notification) =>
					notification.account_id === params[0] &&
					notification.archived === 0 &&
					(notification.user_id === params[1] || notification.user_id === null),
			).length;
			return [{ total }] as T[];
		}

		if (sql === "SELECT DISTINCT account_id FROM team_members WHERE status = 'active'") {
			return [...new Set(
				[...this.teamMembers.values()]
					.filter((member) => member.status === 'active')
					.map((member) => member.account_id),
			)].map((account_id) => ({ account_id })) as T[];
		}

		return [];
	}

	async executeRun(query: string, params: unknown[]): Promise<D1Result> {
		const sql = normalizeSql(query);

		if (
			sql ===
			'INSERT INTO accounts (id, name, plan) VALUES (?, ?, ?)'
		) {
			const account: Account = {
				id: String(params[0]),
				name: String(params[1]),
				plan: String(params[2]) as Account['plan'],
				plan_period_end: null,
				stripe_customer_id: null,
				settings: '{}',
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			};
			this.accounts.set(account.id, account);
			return { success: true, meta: { duration: 0 } } as D1Result;
		}

		if (
			sql ===
			`INSERT INTO users (id, email, name, password_hash, oauth_provider, oauth_id) VALUES (?, ?, ?, ?, ?, ?)`
		) {
			const user: User = {
				id: String(params[0]),
				email: String(params[1]),
				name: String(params[2]),
				password_hash: (params[3] as string | null) ?? null,
				oauth_provider: (params[4] as string | null) ?? null,
				oauth_id: (params[5] as string | null) ?? null,
				email_verified: 0,
				avatar_url: null,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			};
			this.insertUser(user);
			return { success: true, meta: { duration: 0 } } as D1Result;
		}

		if (
			sql ===
			`INSERT INTO team_members (id, account_id, user_id, email, role, status, invited_by) VALUES (?, ?, ?, ?, ?, ?, ?)`
		) {
			const member: TeamMember = {
				id: String(params[0]),
				account_id: String(params[1]),
				user_id: (params[2] as string | null) ?? null,
				email: String(params[3]),
				role: String(params[4]) as TeamMember['role'],
				status: String(params[5]) as TeamMember['status'],
				invited_by: (params[6] as string | null) ?? null,
				invited_at: new Date().toISOString(),
				accepted_at: params[2] ? new Date().toISOString() : null,
				last_active_at: null,
				created_at: new Date().toISOString(),
			};
			this.insertTeamMember(member);
			return { success: true, meta: { duration: 0 } } as D1Result;
		}

		if (
			sql ===
			`INSERT INTO cf_tokens ( id, account_id, label, encrypted_token, cf_account_id, permissions, capabilities, verification_details, status ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
		) {
			const token: CfToken = {
				id: String(params[0]),
				account_id: String(params[1]),
				label: String(params[2]),
				encrypted_token: String(params[3]),
				cf_account_id: (params[4] as string | null) ?? null,
				permissions: String(params[5]),
				capabilities: String(params[6]),
				verification_details: String(params[7]),
				status: String(params[8]) as CfToken['status'],
				last_used_at: null,
				verified_at: null,
				verification_error: null,
				created_at: new Date().toISOString(),
			};
			this.insertCfToken(token);
			return { success: true, meta: { duration: 0 } } as D1Result;
		}

		if (
			sql ===
			`INSERT INTO resources (id, account_id, cf_token_id, cf_resource_id, type, name, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)`
		) {
			const resource: ResourceRecord = {
				id: String(params[0]),
				account_id: String(params[1]),
				cf_token_id: String(params[2]),
				cf_resource_id: String(params[3]),
				type: params[4] as Resource['type'],
				name: String(params[5]),
				metadata: String(params[6]),
				monitoring_status: 'active',
				last_synced_at: null,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			};
			this.insertResource(resource);
			return { success: true, meta: { duration: 0 } } as D1Result;
		}

		if (
			sql ===
			`INSERT INTO resources (id, account_id, cf_token_id, cf_resource_id, type, name, metadata, last_synced_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now')) ON CONFLICT (account_id, type, cf_resource_id) DO UPDATE SET name = excluded.name, metadata = excluded.metadata, last_synced_at = datetime('now'), updated_at = datetime('now')`
		) {
			const existing = [...this.resources.values()].find(
				(resource) =>
					resource.account_id === params[1] &&
					resource.type === params[4] &&
					resource.cf_resource_id === params[3],
			);
			const resource: ResourceRecord = {
				id: existing?.id ?? String(params[0]),
				account_id: String(params[1]),
				cf_token_id: String(params[2]),
				cf_resource_id: String(params[3]),
				type: params[4] as Resource['type'],
				name: String(params[5]),
				metadata: String(params[6]),
				monitoring_status: existing?.monitoring_status ?? 'active',
				last_synced_at: new Date().toISOString(),
				created_at: existing?.created_at ?? new Date().toISOString(),
				updated_at: new Date().toISOString(),
			};
			this.insertResource(resource);
			return { success: true, meta: { duration: 0 } } as D1Result;
		}

		if (
			sql ===
			`INSERT INTO zone_snapshots (id, account_id, resource_id, timestamp, requests, cached_requests, bytes, threats, page_views, unique_visitors, estimated_cost, top_endpoints, top_countries, top_user_agents) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (account_id, resource_id, timestamp) DO UPDATE SET requests = excluded.requests, cached_requests = excluded.cached_requests, bytes = excluded.bytes, threats = excluded.threats, page_views = excluded.page_views, unique_visitors = excluded.unique_visitors, estimated_cost = excluded.estimated_cost, top_endpoints = excluded.top_endpoints, top_countries = excluded.top_countries, top_user_agents = excluded.top_user_agents`
		) {
			const existing = [...this.zoneSnapshots.values()].find(
				(snapshot) =>
					snapshot.account_id === params[1] &&
					snapshot.resource_id === params[2] &&
					snapshot.timestamp === params[3],
			);
			const snapshot: ZoneSnapshotRecord = {
				id: existing?.id ?? String(params[0]),
				account_id: String(params[1]),
				resource_id: String(params[2]),
				timestamp: String(params[3]),
				requests: Number(params[4]),
				cached_requests: Number(params[5]),
				bytes: Number(params[6]),
				threats: Number(params[7]),
				page_views: Number(params[8]),
				unique_visitors: Number(params[9]),
				estimated_cost: Number(params[10]),
				top_endpoints: String(params[11]),
				top_countries: String(params[12]),
				top_user_agents: String(params[13]),
				created_at: new Date().toISOString(),
			};
			this.insertZoneSnapshot(snapshot);
			return { success: true, meta: { duration: 0 } } as D1Result;
		}

		if (
			sql ===
			`INSERT INTO mitigations (id, account_id, name, trigger_type, trigger_condition, action_type, action_config, resource_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
		) {
			const mitigation: Mitigation = {
				id: String(params[0]),
				account_id: String(params[1]),
				name: String(params[2]),
				trigger_type: params[3] as Mitigation['trigger_type'],
				trigger_condition: String(params[4]),
				action_type: params[5] as Mitigation['action_type'],
				action_config: String(params[6]),
				resource_id: (params[7] as string | null) ?? null,
				enabled: 1,
				last_triggered: null,
				trigger_count: 0,
				estimated_savings: 0,
				created_by: (params[8] as string | null) ?? null,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			};
			this.insertMitigation(mitigation);
			return { success: true, meta: { duration: 0 } } as D1Result;
		}

		if (
			sql ===
			`INSERT INTO billing_snapshots (id, account_id, period_start, period_end, total_cost, breakdown, budget_limit) VALUES (?, ?, ?, ?, ?, ?, ?)`
		) {
			const snapshot: BillingSnapshotRecord = {
				id: String(params[0]),
				account_id: String(params[1]),
				period_start: String(params[2]),
				period_end: String(params[3]),
				total_cost: Number(params[4]),
				breakdown: String(params[5]),
				budget_limit: (params[6] as number | null) ?? null,
				status: 'active',
				stripe_invoice_id: null,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			};
			this.insertBillingSnapshot(snapshot);
			return { success: true, meta: { duration: 0 } } as D1Result;
		}

		if (
			sql ===
			'INSERT INTO developer_tokens (id, account_id, user_id, name, token_hash, token_prefix, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
		) {
			const token: DeveloperTokenRecord = {
				id: String(params[0]),
				account_id: String(params[1]),
				user_id: String(params[2]),
				name: String(params[3]),
				token_hash: String(params[4]),
				token_prefix: String(params[5]),
				last_used_at: null,
				expires_at: (params[6] as string | null) ?? null,
				created_at: new Date().toISOString(),
			};
			this.developerTokens.set(token.id, token);
			return { success: true, meta: { duration: 0 } } as D1Result;
		}

		if (
			sql ===
			`INSERT INTO baselines (id, account_id, resource_id, metric, hour_of_day, day_of_week, avg_value, stddev_value, sample_count, last_calculated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now')) ON CONFLICT (resource_id, metric, hour_of_day, day_of_week) DO UPDATE SET avg_value = excluded.avg_value, stddev_value = excluded.stddev_value, sample_count = excluded.sample_count, last_calculated = datetime('now'), updated_at = datetime('now')`
		) {
			const existing = [...this.baselines.values()].find(
				(baseline) =>
					baseline.account_id === params[1] &&
					baseline.resource_id === params[2] &&
					baseline.metric === params[3] &&
					baseline.hour_of_day === params[4] &&
					baseline.day_of_week === params[5],
			);
			const baseline: BaselineRecord = {
				id: existing?.id ?? String(params[0]),
				account_id: String(params[1]),
				resource_id: String(params[2]),
				metric: params[3] as Baseline['metric'],
				hour_of_day: Number(params[4]),
				day_of_week: Number(params[5]),
				avg_value: Number(params[6]),
				stddev_value: Number(params[7]),
				sample_count: Number(params[8]),
				last_calculated: new Date().toISOString(),
				created_at: existing?.created_at ?? new Date().toISOString(),
				updated_at: new Date().toISOString(),
			};
			this.insertBaseline(baseline);
			return { success: true, meta: { duration: 0 } } as D1Result;
		}

		if (
			sql ===
			`INSERT INTO anomalies (id, account_id, resource_id, rule_id, detection_type, metric, severity, current_value, baseline_value, deviation, attribution) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		) {
			const anomaly: AnomalyRecord = {
				id: String(params[0]),
				account_id: String(params[1]),
				resource_id: String(params[2]),
				rule_id: (params[3] as string | null) ?? null,
				detection_type: params[4] as Anomaly['detection_type'],
				metric: params[5] as Anomaly['metric'],
				severity: params[6] as Anomaly['severity'],
				current_value: Number(params[7]),
				baseline_value: (params[8] as number | null) ?? null,
				deviation: (params[9] as number | null) ?? null,
				attribution: String(params[10]),
				status: 'active',
				dismissed_by: null,
				resolved_at: null,
				detected_at: new Date().toISOString(),
				created_at: new Date().toISOString(),
			};
			this.insertAnomaly(anomaly);
			return { success: true, meta: { duration: 0 } } as D1Result;
		}

		if (
			sql ===
			`INSERT INTO notifications (id, account_id, user_id, type, title, body, severity, link) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
		) {
			const notification: NotificationRecord = {
				id: String(params[0]),
				account_id: String(params[1]),
				user_id: (params[2] as string | null) ?? null,
				type: params[3] as Notification['type'],
				title: String(params[4]),
				body: String(params[5]),
				severity: params[6] as Notification['severity'],
				link: (params[7] as string | null) ?? null,
				read: 0,
				archived: 0,
				created_at: new Date().toISOString(),
			};
			this.insertNotification(notification);
			return { success: true, meta: { duration: 0 } } as D1Result;
		}

		if (
			sql ===
			"UPDATE team_members SET last_active_at = datetime('now') WHERE id = ? AND account_id = ?"
		) {
			const member = this.teamMembers.get(String(params[0]));
			if (member && member.account_id === params[1]) {
				member.last_active_at = new Date().toISOString();
				this.teamMembers.set(member.id, member);
			}
			return { success: true, meta: { duration: 0 } } as D1Result;
		}

		if (
			sql ===
			"UPDATE cf_tokens SET last_used_at = datetime('now') WHERE id = ? AND account_id = ?"
		) {
			const token = this.cfTokens.get(String(params[0]));
			if (token && token.account_id === params[1]) {
				token.last_used_at = new Date().toISOString();
				this.cfTokens.set(token.id, token);
			}
			return { success: true, meta: { duration: 0 } } as D1Result;
		}

		if (sql === "UPDATE developer_tokens SET last_used_at = datetime('now') WHERE id = ?") {
			const token = this.developerTokens.get(String(params[0]));
			if (token) {
				token.last_used_at = new Date().toISOString();
				this.developerTokens.set(token.id, token);
			}
			return { success: true, meta: { duration: 0 } } as D1Result;
		}

		if (sql === "UPDATE accounts SET settings = ?, updated_at = datetime('now') WHERE id = ?") {
			const account = this.accounts.get(String(params[1]));
			if (account) {
				account.settings = String(params[0]);
				account.updated_at = new Date().toISOString();
				this.accounts.set(account.id, account);
			}
			return { success: true, meta: { duration: 0 } } as D1Result;
		}

		if (sql === "UPDATE accounts SET updated_at = datetime('now'), name = ?, settings = ? WHERE id = ?") {
			const account = this.accounts.get(String(params[2]));
			if (account) {
				account.name = String(params[0]);
				account.settings = String(params[1]);
				account.updated_at = new Date().toISOString();
				this.accounts.set(account.id, account);
			}
			return { success: true, meta: { duration: 0 } } as D1Result;
		}

		if (sql === "UPDATE accounts SET updated_at = datetime('now'), settings = ? WHERE id = ?") {
			const account = this.accounts.get(String(params[1]));
			if (account) {
				account.settings = String(params[0]);
				account.updated_at = new Date().toISOString();
				this.accounts.set(account.id, account);
			}
			return { success: true, meta: { duration: 0 } } as D1Result;
		}

		if (
			sql ===
			`UPDATE cf_tokens SET status = ?, cf_account_id = COALESCE(?, cf_account_id), permissions = COALESCE(?, permissions), capabilities = COALESCE(?, capabilities), verification_error = ?, verification_details = COALESCE(?, verification_details) WHERE id = ? AND account_id = ?`
		) {
			const token = this.cfTokens.get(String(params[6]));
			if (token && token.account_id === params[7]) {
				token.status = String(params[0]) as CfToken['status'];
				token.cf_account_id = (params[1] as string | null) ?? token.cf_account_id;
				token.permissions = (params[2] as string | null) ?? token.permissions;
				token.capabilities = (params[3] as string | null) ?? token.capabilities;
				token.verification_error = (params[4] as string | null) ?? null;
				token.verification_details =
					(params[5] as string | null) ?? token.verification_details;
				this.cfTokens.set(token.id, token);
			}
			return { success: true, meta: { duration: 0 } } as D1Result;
		}

		if (
			sql ===
			"UPDATE users SET oauth_provider = ?, oauth_id = ?, updated_at = datetime('now') WHERE id = ?"
		) {
			const user = this.users.get(String(params[2]));
			if (user) {
				user.oauth_provider = String(params[0]);
				user.oauth_id = String(params[1]);
				user.updated_at = new Date().toISOString();
				this.insertUser(user);
			}
			return { success: true, meta: { duration: 0 } } as D1Result;
		}

		if (
			sql ===
			`UPDATE cf_tokens SET status = 'active', cf_account_id = ?, permissions = ?, capabilities = ?, verification_error = NULL, verification_details = ?, verified_at = datetime('now') WHERE id = ? AND account_id = ?`
		) {
			const token = this.cfTokens.get(String(params[4]));
			if (token && token.account_id === params[5]) {
				token.status = 'active';
				token.cf_account_id = String(params[0]);
				token.permissions = String(params[1]);
				token.capabilities = String(params[2]);
				token.verification_error = null;
				token.verification_details = String(params[3]);
				token.verified_at = new Date().toISOString();
				this.cfTokens.set(token.id, token);
			}
			return { success: true, meta: { duration: 0 } } as D1Result;
		}

		if (
			sql ===
			"UPDATE mitigations SET enabled = ?, updated_at = datetime('now') WHERE id = ? AND account_id = ?"
		) {
			const mitigation = this.mitigations.get(String(params[1]));
			if (mitigation && mitigation.account_id === params[2]) {
				mitigation.enabled = Number(params[0]);
				mitigation.updated_at = new Date().toISOString();
				this.mitigations.set(mitigation.id, mitigation);
			}
			return { success: true, meta: { duration: 0 } } as D1Result;
		}

		if (
			sql ===
			`UPDATE team_members SET user_id = ?, status = 'active', accepted_at = datetime('now') WHERE id = ? AND account_id = ?`
		) {
			const member = this.teamMembers.get(String(params[1]));
			if (member && member.account_id === params[2]) {
				member.user_id = String(params[0]);
				member.status = 'active';
				member.accepted_at = new Date().toISOString();
				this.teamMembers.set(member.id, member);
			}
			return { success: true, meta: { duration: 0 } } as D1Result;
		}

		if (sql === 'DELETE FROM developer_tokens WHERE id = ? AND account_id = ?') {
			const token = this.developerTokens.get(String(params[0]));
			if (token && token.account_id === params[1]) {
				this.developerTokens.delete(token.id);
			}
			return { success: true, meta: { duration: 0 } } as D1Result;
		}

		if (
			sql ===
			'UPDATE notifications SET read = 1 WHERE id = ? AND account_id = ? AND (user_id = ? OR user_id IS NULL)'
		) {
			const notification = this.notifications.get(String(params[0]));
			if (notification && notification.account_id === params[1] && (notification.user_id === null || notification.user_id === params[2])) {
				notification.read = 1;
				this.notifications.set(notification.id, notification);
			}
			return { success: true, meta: { duration: 0 } } as D1Result;
		}

		if (
			sql ===
			`UPDATE mitigations SET last_triggered = datetime('now'), trigger_count = trigger_count + 1, estimated_savings = estimated_savings + ?, updated_at = datetime('now') WHERE id = ? AND account_id = ?`
		) {
			const mitigation = this.mitigations.get(String(params[1]));
			if (mitigation && mitigation.account_id === params[2]) {
				mitigation.last_triggered = new Date().toISOString();
				mitigation.trigger_count += 1;
				mitigation.estimated_savings += Number(params[0]);
				mitigation.updated_at = new Date().toISOString();
				this.mitigations.set(mitigation.id, mitigation);
			}
			return { success: true, meta: { duration: 0 } } as D1Result;
		}

		if (
			sql ===
			`INSERT INTO audit_logs (id, account_id, user_id, user_email, action, entity_type, entity_id, description, ip_address, user_agent, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		) {
			this.auditLogs.push({
				id: String(params[0]),
				account_id: String(params[1]),
				user_id: (params[2] as string | null) ?? null,
				user_email: (params[3] as string | null) ?? null,
				action: String(params[4]),
				entity_type: String(params[5]),
				entity_id: (params[6] as string | null) ?? null,
				description: String(params[7]),
				ip_address: (params[8] as string | null) ?? null,
				user_agent: (params[9] as string | null) ?? null,
				metadata: String(params[10]),
			});
			return { success: true, meta: { duration: 0 } } as D1Result;
		}

		throw new Error(`Unsupported run() query in FakeD1Database: ${sql}`);
	}

	insertUser(user: User) {
		this.users.set(user.id, user);
		this.usersByEmail.set(user.email, user);
	}

	insertAccount(account: Account) {
		this.accounts.set(account.id, account);
	}

	insertTeamMember(member: TeamMember) {
		this.teamMembers.set(member.id, member);
	}

	insertCfToken(token: CfTokenRecord) {
		this.cfTokens.set(token.id, token);
	}

	insertResource(resource: ResourceRecord) {
		this.resources.set(resource.id, resource);
	}

	insertBaseline(baseline: BaselineRecord) {
		this.baselines.set(baseline.id, baseline);
	}

	insertRule(rule: RuleRecord) {
		this.rules.set(rule.id, rule);
	}

	insertAnomaly(anomaly: AnomalyRecord) {
		this.anomalies.set(anomaly.id, anomaly);
	}

	insertNotification(notification: NotificationRecord) {
		this.notifications.set(notification.id, notification);
	}

	insertDeveloperToken(token: DeveloperTokenRecord) {
		this.developerTokens.set(token.id, token);
	}

	insertMitigation(mitigation: Mitigation) {
		this.mitigations.set(mitigation.id, mitigation);
	}

	insertBillingSnapshot(snapshot: BillingSnapshotRecord) {
		this.billingSnapshots.set(snapshot.id, snapshot);
	}

	insertZoneSnapshot(snapshot: ZoneSnapshotRecord) {
		for (const [key, existing] of this.zoneSnapshots.entries()) {
			if (
				existing.account_id === snapshot.account_id &&
				existing.resource_id === snapshot.resource_id &&
				existing.timestamp === snapshot.timestamp &&
				key !== snapshot.id
			) {
				this.zoneSnapshots.delete(key);
			}
		}
		this.zoneSnapshots.set(snapshot.id, snapshot);
	}
}

export function createTestEnv(overrides: Partial<Env> = {}): Env {
	return {
		DB: new FakeD1Database(),
		SESSIONS: new FakeKVNamespace(),
		CACHE: new FakeKVNamespace(),
		ALERT_DISPATCH_QUEUE: {} as Queue,
		ANOMALY_CHECK_QUEUE: {} as Queue,
		LIVE_FEED: {} as DurableObjectNamespace,
		ENVIRONMENT: 'test',
		WEB_URL: 'http://localhost:5173',
		API_URL: 'http://localhost:5174',
		TOKEN_ENCRYPTION_KEY:
			'0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
		RESEND_API_KEY: '',
		...overrides,
	};
}
