import { ExternalServiceError } from '@flarelens/shared';

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
	policies?: Array<{ permissionGroups: Array<{ name: string }> }>;
}

export class CloudflareClient {
	private token: string;
	private accountId: string;

	constructor(token: string, accountId: string) {
		this.token = token;
		this.accountId = accountId;
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

	async listZones(): Promise<CfZone[]> {
		const result = await this.request<CfZone[]>(
			`/zones?account.id=${this.accountId}&per_page=50&status=active`,
		);
		return result ?? [];
	}

	async listWorkers(): Promise<CfWorkerScript[]> {
		const result = await this.request<CfWorkerScript[]>(
			`/accounts/${this.accountId}/workers/scripts`,
		);
		return result ?? [];
	}

	async listR2Buckets(): Promise<CfR2Bucket[]> {
		const result = await this.request<{ buckets: CfR2Bucket[] }>(
			`/accounts/${this.accountId}/r2/buckets`,
		);
		return result?.buckets ?? [];
	}

	async listKvNamespaces(): Promise<CfKvNamespace[]> {
		const result = await this.request<CfKvNamespace[]>(
			`/accounts/${this.accountId}/storage/kv/namespaces?per_page=100`,
		);
		return result ?? [];
	}

	async listD1Databases(): Promise<CfD1Database[]> {
		const result = await this.request<CfD1Database[]>(`/accounts/${this.accountId}/d1/database`);
		return result ?? [];
	}

	async setZoneSecurityLevel(zoneId: string, level: string): Promise<void> {
		await this.request(`/zones/${zoneId}/settings/security_level`, {
			method: 'PATCH',
			body: JSON.stringify({ value: level }),
		});
	}

	async createRateLimitRule(zoneId: string, opts: { threshold: number; period: number }): Promise<string> {
		const result = await this.request<{ id: string }>(`/zones/${zoneId}/rate_limits`, {
			method: 'POST',
			body: JSON.stringify({
				match: { request: { url: { pattern: `*${zoneId}/*`, zone_name: '' } } },
				threshold: opts.threshold,
				period: opts.period,
				action: { mode: 'simulate' },
				enabled: true,
				description: 'FlareLens auto rate limit',
			}),
		});
		return result.id;
	}

	async blockUserAgent(zoneId: string, userAgent: string): Promise<void> {
		await this.request(`/zones/${zoneId}/firewall/access_rules/rules`, {
			method: 'POST',
			body: JSON.stringify({
				mode: 'block',
				configuration: { target: 'user_agent', value: userAgent },
				notes: `FlareLens auto-block UA: ${userAgent}`,
			}),
		});
	}

	async disableWorkerSubdomain(scriptName: string): Promise<void> {
		// Disable the workers.dev subdomain route for this script
		await this.request(`/accounts/${this.accountId}/workers/scripts/${scriptName}/subdomain`, {
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
}
