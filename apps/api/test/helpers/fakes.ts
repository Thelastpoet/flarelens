import type { CfToken, TeamMember, User } from '@flarelens/shared';
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
	users = new Map<string, User>();
	usersByEmail = new Map<string, User>();
	teamMembers = new Map<string, TeamMember>();
	cfTokens = new Map<string, CfTokenRecord>();
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

		if (sql === 'SELECT * FROM cf_tokens WHERE id = ? AND account_id = ?') {
			const token = this.cfTokens.get(String(params[0]));
			if (!token || token.account_id !== params[1]) return null;
			return token as T;
		}

		throw new Error(`Unsupported first() query in FakeD1Database: ${sql}`);
	}

	async executeAll<T>(): Promise<T[]> {
		return [];
	}

	async executeRun(query: string, params: unknown[]): Promise<D1Result> {
		const sql = normalizeSql(query);

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

	insertTeamMember(member: TeamMember) {
		this.teamMembers.set(member.id, member);
	}

	insertCfToken(token: CfTokenRecord) {
		this.cfTokens.set(token.id, token);
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
