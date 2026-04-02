import type { CfToken, User } from '@flarelens/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encryptToken } from '../../src/auth/crypto.js';
import { createSession } from '../../src/auth/session.js';
import { createTestApp } from '../helpers/app.js';
import { createTestEnv, FakeD1Database } from '../helpers/fakes.js';

const accountId = 'acct_local';
const userId = 'user_local';
const cfTokenId = 'cftok_123';
const cfAccountId = 'cf_account_123';
const zoneId = 'zone_123';

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

async function makeCfToken(encryptionKey: string): Promise<CfToken> {
	return {
		id: cfTokenId,
		account_id: accountId,
		label: 'Primary token',
		encrypted_token: await encryptToken('cf-secret-token', encryptionKey),
		cf_account_id: null,
		permissions: '[]',
		capabilities: '[]',
		status: 'pending',
		last_used_at: null,
		verified_at: null,
		verification_error: null,
		verification_details: '{}',
		created_at: new Date().toISOString(),
	};
}

describe('Cloudflare token verification', () => {
	let db: FakeD1Database;
	let env: ReturnType<typeof createTestEnv>;
	let app: ReturnType<typeof createTestApp>;
	let sessionCookie: string;

	beforeEach(async () => {
		vi.restoreAllMocks();
		db = new FakeD1Database();
		env = createTestEnv({ DB: db });
		db.insertUser(makeUser());
		db.insertCfToken(await makeCfToken(env.TOKEN_ENCRYPTION_KEY));
		app = createTestApp();

		const { cookieHeader } = await createSession(
			env.SESSIONS,
			{ user_id: userId, account_id: accountId, role: 'admin' },
			'localhost:5174',
		);
		sessionCookie = cookieHeader.split(';')[0];
	});

	it('verifies a token by resolving account identity and storing derived capabilities', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: RequestInfo | URL) => {
				const url = String(input);
				if (url.endsWith(`/accounts/${cfAccountId}/tokens/verify`)) {
					return Response.json({
						success: true,
						result: {
							id: 'verify_123',
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
				throw new Error(`Unexpected fetch URL in success test: ${url}`);
			}),
		);

		const res = await app.fetch(
			new Request(`http://localhost:5174/cf-tokens/${cfTokenId}/verify`, {
				method: 'POST',
				headers: { Cookie: sessionCookie },
			}),
			env,
			{} as ExecutionContext,
		);

		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			verified: boolean;
			cf_account_id: string;
			capabilities: string[];
		};
		expect(body.verified).toBe(true);
		expect(body.cf_account_id).toBe(cfAccountId);
		expect(body.capabilities).toEqual(
			expect.arrayContaining(['zones:read', 'zones.analytics:read']),
		);

		const storedToken = db.cfTokens.get(cfTokenId);
		expect(storedToken?.cf_account_id).toBe(cfAccountId);
		expect(JSON.parse(storedToken?.capabilities ?? '[]')).toEqual(
			expect.arrayContaining(['zones:read', 'zones.analytics:read']),
		);
		expect(storedToken?.verification_error).toBeNull();
		expect(storedToken?.verified_at).toBeTruthy();
	});

	it('marks the token invalid when required capabilities cannot be proven', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: RequestInfo | URL) => {
				const url = String(input);
				if (url.endsWith(`/accounts/${cfAccountId}/tokens/verify`)) {
					return Response.json({
						success: true,
						result: { id: 'verify_123', status: 'active' },
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
					return new Response(
						JSON.stringify({
							success: false,
							errors: [{ message: 'Forbidden' }],
						}),
						{
							status: 403,
							headers: { 'Content-Type': 'application/json' },
						},
					);
				}
				throw new Error(`Unexpected fetch URL in failure test: ${url}`);
			}),
		);

		const res = await app.fetch(
			new Request(`http://localhost:5174/cf-tokens/${cfTokenId}/verify`, {
				method: 'POST',
				headers: { Cookie: sessionCookie },
			}),
			env,
			{} as ExecutionContext,
		);

		expect(res.status).toBe(400);
		const body = (await res.json()) as { error: string };
		expect(body.error).toContain('zones.analytics:read');

		const storedToken = db.cfTokens.get(cfTokenId);
		expect(storedToken?.status).toBe('invalid');
		expect(storedToken?.verification_error).toContain('zones.analytics:read');
	});
});
