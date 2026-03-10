import type { Account, CfToken, Resource, TeamMember } from '@flarelens/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encryptToken } from '../../src/auth/crypto.js';
import { runMetricsPoll } from '../../src/crons/metrics-poll.js';
import { createTestEnv, FakeD1Database, FakeKVNamespace } from '../helpers/fakes.js';

const accountId = 'acct_poll';

class FakeQueue {
	messages: unknown[] = [];

	async send(message: unknown): Promise<void> {
		this.messages.push(message);
	}
}

class FakeDurableObjectStub {
	requests: Request[] = [];

	async fetch(request: Request): Promise<Response> {
		this.requests.push(request);
		return new Response(null, { status: 204 });
	}
}

class FakeDurableObjectNamespace {
	stub = new FakeDurableObjectStub();

	idFromName(name: string): DurableObjectId {
		return { toString: () => name, equals: () => false, name } as unknown as DurableObjectId;
	}

	get(): DurableObjectStub {
		return this.stub as unknown as DurableObjectStub;
	}
}

function makeAccount(): Account {
	return {
		id: accountId,
		name: 'Polling Account',
		plan: 'pro',
		plan_period_end: null,
		stripe_customer_id: null,
		settings: '{}',
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	};
}

function makeMembership(): TeamMember {
	return {
		id: 'member_poll',
		account_id: accountId,
		user_id: 'user_poll',
		email: 'owner@example.com',
		role: 'admin',
		status: 'active',
		invited_by: 'user_poll',
		invited_at: new Date().toISOString(),
		accepted_at: new Date().toISOString(),
		last_active_at: null,
		created_at: new Date().toISOString(),
	};
}

function makeResource(): Resource {
	return {
		id: 'resource_poll',
		account_id: accountId,
		cf_token_id: 'cftok_poll',
		cf_resource_id: 'zone_cf_123',
		type: 'zone',
		name: 'example.com',
		monitoring_status: 'active',
		metadata: '{}',
		last_synced_at: null,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	};
}

async function makeToken(key: string): Promise<CfToken> {
	return {
		id: 'cftok_poll',
		account_id: accountId,
		label: 'Polling token',
		encrypted_token: await encryptToken('cf-secret-token', key),
		cf_account_id: 'cf_account_poll',
		permissions: '[]',
		capabilities: JSON.stringify(['zones:read', 'zones.analytics:read']),
		status: 'active',
		last_used_at: null,
		verified_at: new Date().toISOString(),
		verification_error: null,
		verification_details: '{}',
		created_at: new Date().toISOString(),
	};
}

describe('metrics poll pipeline', () => {
	let db: FakeD1Database;
	let anomalyQueue: FakeQueue;

	beforeEach(async () => {
		vi.restoreAllMocks();
		db = new FakeD1Database();
		anomalyQueue = new FakeQueue();
		db.insertAccount(makeAccount());
		db.insertTeamMember(makeMembership());
		db.insertResource(makeResource());
		const env = createTestEnv({ DB: db });
		db.insertCfToken(await makeToken(env.TOKEN_ENCRYPTION_KEY));
	});

	it('persists real zone metrics and fans out anomaly checks for supported zone metrics', async () => {
		const liveFeed = new FakeDurableObjectNamespace();
		const env = createTestEnv({
			DB: db,
			ANOMALY_CHECK_QUEUE: anomalyQueue as unknown as Queue,
			LIVE_FEED: liveFeed as unknown as DurableObjectNamespace,
			CACHE: new FakeKVNamespace(),
		});

		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: RequestInfo | URL) => {
				const url = String(input);
				if (url.endsWith('/graphql')) {
					return Response.json({
						data: {
							viewer: {
								zones: [
									{
										httpRequests1mGroups: [
											{
												dimensions: { datetime: '2026-03-10T10:00:00.000Z' },
												sum: {
													requests: 200,
													cachedRequests: 80,
													bytes: 5000,
													cachedBytes: 2000,
													threats: 7,
													pageViews: 30,
													countryMap: [
														{ clientCountryName: 'KE', requests: 120, bytes: 3000, threats: 4 },
														{ clientCountryName: 'US', requests: 80, bytes: 2000, threats: 3 },
													],
													responseStatusMap: [],
												},
											},
										],
									},
								],
							},
						},
					});
				}
				throw new Error(`Unexpected fetch URL in metrics poll test: ${url}`);
			}),
		);

		await runMetricsPoll(env);

		expect(anomalyQueue.messages).toHaveLength(4);
		expect(anomalyQueue.messages).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ metric: 'requests', current_value: 200 }),
				expect.objectContaining({ metric: 'bytes', current_value: 5000 }),
				expect.objectContaining({ metric: 'cached_requests', current_value: 80 }),
				expect.objectContaining({ metric: 'threats', current_value: 7 }),
			]),
		);

		const [storedSnapshot] = [...db.zoneSnapshots.values()];
		expect(storedSnapshot.threats).toBe(7);
		expect(storedSnapshot.page_views).toBe(30);
		expect(JSON.parse(storedSnapshot.top_countries)).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ country: 'KE', requests: 120 }),
				expect.objectContaining({ country: 'US', requests: 80 }),
			]),
		);
	});
});
