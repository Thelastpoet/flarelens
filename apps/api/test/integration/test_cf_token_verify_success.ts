import type { User } from '@flarelens/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSession } from '../../src/auth/session.js';
import { createTestApp } from '../helpers/app.js';
import { createTestEnv, FakeD1Database } from '../helpers/fakes.js';

const accountId = 'acct_success';
const userId = 'user_success';
const cfAccountId = 'cf_account_success';
const zoneId = 'zone_success';

function makeUser(): User {
	return {
		id: userId,
		email: 'owner@example.com',
		email_verified: 1,
		password_hash: null,
		name: 'Owner',
		avatar_url: null,
		oauth_provider: null,
		oauth_id: null,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	};
}

describe('POST /cf-tokens/:id/verify success path', () => {
	let db: FakeD1Database;
	let env: ReturnType<typeof createTestEnv>;
	let app: ReturnType<typeof createTestApp>;
	let sessionCookie: string;

	beforeEach(async () => {
		vi.restoreAllMocks();
		db = new FakeD1Database();
		env = createTestEnv({ DB: db });
		db.insertUser(makeUser());
		app = createTestApp();

		const { cookieHeader } = await createSession(
			env.SESSIONS,
			{ user_id: userId, account_id: accountId, role: 'admin' },
			'localhost:5174',
		);
		sessionCookie = cookieHeader.split(';')[0];
	});

	it('saves a token as pending, then verifies it into a usable account-scoped state', async () => {
		const addRes = await app.fetch(
			new Request('http://localhost:5174/cf-tokens', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Cookie: sessionCookie,
				},
				body: JSON.stringify({
					label: 'Primary token',
					token: 'cf-secret-token',
				}),
			}),
			env,
			{} as ExecutionContext,
		);

		expect(addRes.status).toBe(201);
		const addBody = (await addRes.json()) as { token: { id: string; status: string } };
		expect(addBody.token.status).toBe('pending');

		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: RequestInfo | URL) => {
				const url = String(input);
				if (url.endsWith(`/accounts/${cfAccountId}/tokens/verify`)) {
					return Response.json({
						success: true,
						result: {
							id: 'verify_success',
							status: 'active',
							expires_on: '2026-12-31T00:00:00Z',
							not_before: '2026-01-01T00:00:00Z',
						},
					});
				}
				if (url.includes('/accounts?per_page=50')) {
					return Response.json({
						success: true,
						result: [{ id: cfAccountId, name: 'Primary CF Account' }],
					});
				}
				if (url.includes(`/zones?account.id=${cfAccountId}`)) {
					return Response.json({
						success: true,
						result: [{ id: zoneId, name: 'example.com', status: 'active', plan: { name: 'pro' } }],
					});
				}
				if (url.includes(`/accounts/${cfAccountId}/workers/scripts`)) {
					return Response.json({ success: true, result: [] });
				}
				if (url.includes(`/accounts/${cfAccountId}/r2/buckets`)) {
					return Response.json({ success: true, result: { buckets: [] } });
				}
				if (url.includes(`/accounts/${cfAccountId}/storage/kv/namespaces`)) {
					return Response.json({ success: true, result: [] });
				}
				if (url.includes(`/accounts/${cfAccountId}/d1/database`)) {
					return Response.json({ success: true, result: [] });
				}
				if (url.endsWith('/graphql')) {
					return Response.json({
						data: {
							viewer: {
								zones: [{ httpRequests1hGroups: [] }],
							},
						},
					});
				}
				throw new Error(`Unexpected fetch URL in success contract test: ${url}`);
			}),
		);

		const verifyRes = await app.fetch(
			new Request(`http://localhost:5174/cf-tokens/${addBody.token.id}/verify`, {
				method: 'POST',
				headers: { Cookie: sessionCookie },
			}),
			env,
			{} as ExecutionContext,
		);

		expect(verifyRes.status).toBe(200);
		const verifyBody = (await verifyRes.json()) as {
			verified: boolean;
			cf_account_id: string;
			capabilities: string[];
		};
		expect(verifyBody.verified).toBe(true);
		expect(verifyBody.cf_account_id).toBe(cfAccountId);
		expect(verifyBody.capabilities).toEqual(
			expect.arrayContaining(['zones:read', 'zones.analytics:read']),
		);

		const storedToken = db.cfTokens.get(addBody.token.id);
		expect(storedToken?.status).toBe('active');
		expect(storedToken?.cf_account_id).toBe(cfAccountId);
		expect(storedToken?.verified_at).toBeTruthy();
	});
});
