import type { Account, CfToken, Mitigation, TeamMember, User } from '@flarelens/shared';
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
	mitigations = new Map<string, Mitigation>();
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

		if (sql === 'SELECT * FROM users WHERE id = ?') {
			return (this.users.get(String(params[0])) ?? null) as T | null;
		}

		if (sql === 'SELECT * FROM accounts WHERE id = ?') {
			return (this.accounts.get(String(params[0])) ?? null) as T | null;
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

		if (sql === 'SELECT * FROM team_members WHERE id = ?') {
			return (this.teamMembers.get(String(params[0])) ?? null) as T | null;
		}

		if (sql === 'SELECT * FROM mitigations WHERE id = ? AND account_id = ?') {
			const mitigation = this.mitigations.get(String(params[0]));
			if (!mitigation || mitigation.account_id !== params[1]) return null;
			return mitigation as T;
		}

		if (sql === 'SELECT * FROM cf_tokens WHERE id = ? AND account_id = ?') {
			const token = this.cfTokens.get(String(params[0]));
			if (!token || token.account_id !== params[1]) return null;
			return token as T;
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

		if (sql === 'SELECT * FROM mitigations WHERE account_id = ? AND enabled = 1') {
			return [...this.mitigations.values()].filter(
				(mitigation) => mitigation.account_id === params[0] && mitigation.enabled === 1,
			) as T[];
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

		if (sql === "UPDATE accounts SET settings = ?, updated_at = datetime('now') WHERE id = ?") {
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

	insertMitigation(mitigation: Mitigation) {
		this.mitigations.set(mitigation.id, mitigation);
	}
}

export function createTestEnv(overrides: Partial<Env> = {}): Env {
	return {
		DB: new FakeD1Database(),
		SESSIONS: new FakeKVNamespace(),
		CACHE: new FakeKVNamespace(),
		REPORTS: {} as R2Bucket,
		ALERT_DISPATCH_QUEUE: {} as Queue,
		ANOMALY_CHECK_QUEUE: {} as Queue,
		ANALYTICS: {} as AnalyticsEngineDataset,
		LIVE_FEED: {} as DurableObjectNamespace,
		ENVIRONMENT: 'test',
		WEB_URL: 'http://localhost:5173',
		API_URL: 'http://localhost:5174',
		TOKEN_ENCRYPTION_KEY:
			'0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
		SESSION_SECRET: 'test-session-secret',
		RESEND_API_KEY: '',
		...overrides,
	};
}
