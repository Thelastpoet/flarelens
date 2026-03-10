import type {
	CfAccountSource,
	CfCapability,
	CfCapabilityProbe,
	CfTokenVerificationDetails,
} from '@flarelens/shared';
import { ExternalServiceError } from '@flarelens/shared';
import { GqlQueries } from './graphql.js';

const CF_REST_BASE = 'https://api.cloudflare.com/client/v4';
const CF_GRAPHQL_URL = 'https://api.cloudflare.com/client/v4/graphql';

export interface CfZone {
	id: string;
	name: string;
	status: string;
	plan: { name: string };
}

export interface CfWorkerScript {
	id: string;
	etag: string;
	modified_on: string;
}

export interface CfR2Bucket {
	name: string;
	creation_date: string;
}

export interface CfKvNamespace {
	id: string;
	title: string;
}

export interface CfD1Database {
	uuid: string;
	name: string;
}

export interface CfTokenVerifyResult {
	id: string;
	status: string;
	expires_on?: string | null;
	not_before?: string | null;
}

export interface CfAccount {
	id: string;
	name: string;
}

export interface CfMembership {
	account: CfAccount;
	status: 'accepted' | 'pending' | 'rejected';
}

export interface CfResolvedAccount {
	id: string;
	name: string | null;
	source: CfAccountSource;
}

export interface CfCapabilityProbeResult {
	capabilities: CfCapability[];
	probes: CfCapabilityProbe[];
}

export class CloudflareClient {
	private token: string;
	private accountId: string | null;

	constructor(token: string, accountId?: string | null) {
		this.token = token;
		this.accountId = accountId ?? null;
	}

	private get headers() {
		return {
			Authorization: `Bearer ${this.token}`,
			'Content-Type': 'application/json',
		};
	}

	private async request<T>(path: string, options?: RequestInit): Promise<T> {
		const url = path.startsWith('http') ? path : `${CF_REST_BASE}${path}`;
		let attempt = 0;
		const maxAttempts = 4;
		let delay = 1000;

		while (attempt < maxAttempts) {
			const res = await fetch(url, {
				...options,
				headers: { ...this.headers, ...options?.headers },
			});

			if (res.status === 429) {
				attempt++;
				if (attempt < maxAttempts) {
					await new Promise((r) => setTimeout(r, delay));
					delay = Math.min(delay * 2, 30000);
					continue;
				}
			}

			if (!res.ok) {
				const body = (await res.json().catch(() => ({}))) as {
					errors?: Array<{ message: string }>;
				};
				const msg = body?.errors?.[0]?.message ?? res.statusText;
				throw new ExternalServiceError('Cloudflare', `${res.status}: ${msg}`);
			}

			const json = (await res.json()) as { success: boolean; result: T };
			if (!json.success) throw new ExternalServiceError('Cloudflare', 'API returned success=false');
			return json.result;
		}

		throw new ExternalServiceError('Cloudflare', 'Rate limit exceeded after retries');
	}

	async verifyToken(): Promise<CfTokenVerifyResult> {
		return this.request<CfTokenVerifyResult>('/user/tokens/verify');
	}

	async listAccounts(): Promise<CfAccount[]> {
		return this.request<CfAccount[]>('/accounts?per_page=50');
	}

	async listMemberships(): Promise<CfMembership[]> {
		return this.request<CfMembership[]>('/memberships?status=accepted&per_page=50');
	}

	async resolveAccount(preferredAccountId?: string | null): Promise<CfResolvedAccount> {
		if (preferredAccountId) {
			return { id: preferredAccountId, name: null, source: 'stored' };
		}

		try {
			const accounts = await this.listAccounts();
			if (accounts.length === 1) {
				return { id: accounts[0].id, name: accounts[0].name, source: 'accounts_list' };
			}
			if (accounts.length > 1) {
				throw new ExternalServiceError(
					'Cloudflare',
					'Token can access multiple accounts; store an explicit Cloudflare account ID before verification',
				);
			}
		} catch (error) {
			if (!(error instanceof ExternalServiceError)) throw error;
			const memberships = await this.listMemberships();
			if (memberships.length === 1) {
				return {
					id: memberships[0].account.id,
					name: memberships[0].account.name,
					source: 'memberships',
				};
			}
			if (memberships.length > 1) {
				throw new ExternalServiceError(
					'Cloudflare',
					'Token can access multiple account memberships; store an explicit Cloudflare account ID before verification',
				);
			}
			throw error;
		}

		throw new ExternalServiceError(
			'Cloudflare',
			'No accessible accounts were found for this token',
		);
	}

	private requireAccountId(accountId?: string | null): string {
		const resolved = accountId ?? this.accountId;
		if (!resolved) {
			throw new ExternalServiceError('Cloudflare', 'Account ID is required for this operation');
		}
		return resolved;
	}

	async listZones(accountId?: string | null): Promise<CfZone[]> {
		const resolvedAccountId = this.requireAccountId(accountId);
		const result = await this.request<CfZone[]>(
			`/zones?account.id=${resolvedAccountId}&per_page=50&status=active`,
		);
		return result ?? [];
	}

	async listWorkers(accountId?: string | null): Promise<CfWorkerScript[]> {
		const resolvedAccountId = this.requireAccountId(accountId);
		const result = await this.request<CfWorkerScript[]>(
			`/accounts/${resolvedAccountId}/workers/scripts`,
		);
		return result ?? [];
	}

	async listR2Buckets(accountId?: string | null): Promise<CfR2Bucket[]> {
		const resolvedAccountId = this.requireAccountId(accountId);
		const result = await this.request<{ buckets: CfR2Bucket[] }>(
			`/accounts/${resolvedAccountId}/r2/buckets`,
		);
		return result?.buckets ?? [];
	}

	async listKvNamespaces(accountId?: string | null): Promise<CfKvNamespace[]> {
		const resolvedAccountId = this.requireAccountId(accountId);
		const result = await this.request<CfKvNamespace[]>(
			`/accounts/${resolvedAccountId}/storage/kv/namespaces?per_page=100`,
		);
		return result ?? [];
	}

	async listD1Databases(accountId?: string | null): Promise<CfD1Database[]> {
		const resolvedAccountId = this.requireAccountId(accountId);
		const result = await this.request<CfD1Database[]>(`/accounts/${resolvedAccountId}/d1/database`);
		return result ?? [];
	}

	async setZoneSecurityLevel(zoneId: string, level: string): Promise<void> {
		await this.request(`/zones/${zoneId}/settings/security_level`, {
			method: 'PATCH',
			body: JSON.stringify({ value: level }),
		});
	}

	async createRateLimitRule(
		zoneId: string,
		opts: {
			threshold: number;
			period: number;
			actionMode: 'ban' | 'challenge' | 'js_challenge' | 'managed_challenge';
			urlPattern?: string;
			mitigationTimeout?: number;
		},
	): Promise<string> {
		const action: Record<string, unknown> = { mode: opts.actionMode };
		if (opts.actionMode === 'ban' && opts.mitigationTimeout) {
			action.timeout = opts.mitigationTimeout;
		}

		const result = await this.request<{ id: string }>(`/zones/${zoneId}/rate_limits`, {
			method: 'POST',
			body: JSON.stringify({
				match: { request: { url: opts.urlPattern ?? '*' } },
				threshold: opts.threshold,
				period: opts.period,
				action,
				description: 'FlareLens auto rate limit',
			}),
		});
		return result.id;
	}

	async disableWorkerSubdomain(scriptName: string): Promise<void> {
		const resolvedAccountId = this.requireAccountId();
		// Disable the workers.dev subdomain route for this script
		await this.request(`/accounts/${resolvedAccountId}/workers/scripts/${scriptName}/subdomain`, {
			method: 'POST',
			body: JSON.stringify({ enabled: false }),
		});
	}

	async graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
		const res = await fetch(CF_GRAPHQL_URL, {
			method: 'POST',
			headers: this.headers,
			body: JSON.stringify({ query, variables }),
		});

		if (res.status === 429)
			throw new ExternalServiceError('Cloudflare', 'GraphQL rate limit exceeded');
		if (!res.ok) throw new ExternalServiceError('Cloudflare', `GraphQL HTTP ${res.status}`);

		const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
		if (json.errors?.length) {
			throw new ExternalServiceError('Cloudflare', json.errors[0].message);
		}
		return json.data as T;
	}

	private async probeCapability(
		capability: CfCapability,
		run: () => Promise<void>,
	): Promise<CfCapabilityProbe> {
		try {
			await run();
			return { capability, ok: true, detail: null };
		} catch (error) {
			const detail =
				error instanceof Error ? error.message : 'Capability probe failed unexpectedly';
			return { capability, ok: false, detail };
		}
	}

	async probeCapabilities(accountId: string): Promise<CfCapabilityProbeResult> {
		this.accountId = accountId;

		const zones = await this.listZones(accountId);
		if (zones.length === 0) {
			throw new ExternalServiceError(
				'Cloudflare',
				'No active zones are accessible for this account; zone monitoring cannot be enabled',
			);
		}

		const firstZoneId = zones[0].id;
		const analyticsProbe = await this.probeCapability('zones.analytics:read', async () => {
			const now = new Date();
			const from = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
			const to = now.toISOString();
			const query = GqlQueries.zoneTraffic(firstZoneId, from, to, 1);
			await this.graphql<unknown>(query.query, query.variables);
		});

		const probes = [
			{ capability: 'zones:read' as const, ok: true, detail: null },
			analyticsProbe,
			await this.probeCapability('workers:read', async () => {
				await this.listWorkers(accountId);
			}),
			await this.probeCapability('r2:read', async () => {
				await this.listR2Buckets(accountId);
			}),
			await this.probeCapability('kv:read', async () => {
				await this.listKvNamespaces(accountId);
			}),
			await this.probeCapability('d1:read', async () => {
				await this.listD1Databases(accountId);
			}),
		];

		return {
			capabilities: probes.filter((probe) => probe.ok).map((probe) => probe.capability),
			probes,
		};
	}

	buildVerificationDetails(input: {
		verifyResult: CfTokenVerifyResult;
		account: {
			id: string | null;
			name: string | null;
			source: CfAccountSource | null;
		};
		probes: CfCapabilityProbe[];
	}): CfTokenVerificationDetails {
		return {
			token_id: input.verifyResult.id ?? null,
			token_status: input.verifyResult.status ?? null,
			expires_on: input.verifyResult.expires_on ?? null,
			not_before: input.verifyResult.not_before ?? null,
			account_id: input.account.id,
			account_name: input.account.name,
			account_source: input.account.source,
			probes: input.probes,
			checked_at: new Date().toISOString(),
		};
	}
}
