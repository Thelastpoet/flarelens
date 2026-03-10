import type { CfToken, User } from '@flarelens/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encryptToken } from '../../src/auth/crypto.js';
import { createSession } from '../../src/auth/session.js';
import { createTestApp } from '../helpers/app.js';
import { createTestEnv, FakeD1Database } from '../helpers/fakes.js';

const accountId = 'acct_failure';
const userId = 'user_failure';
const cfTokenId = 'cftok_failure';
const cfAccountId = 'cf_account_failure';
const zoneId = 'zone_failure';

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

describe('POST /cf-tokens/:id/verify failure modes', () => {
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

	it('rejects inactive token statuses', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: RequestInfo | URL) => {
				const url = String(input);
				if (url.endsWith('/user/tokens/verify')) {
					return Response.json({
						success: true,
						result: { id: 'verify_failure', status: 'disabled' },
					});
				}
				throw new Error(`Unexpected fetch URL for inactive status test: ${url}`);
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
		expect(body.error).toContain("Token status is 'disabled'");
		expect(db.cfTokens.get(cfTokenId)?.status).toBe('invalid');
	});

	it('rejects tokens when required analytics capability cannot be proven', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: RequestInfo | URL) => {
				const url = String(input);
				if (url.endsWith('/user/tokens/verify')) {
					return Response.json({
						success: true,
						result: { id: 'verify_failure', status: 'active' },
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
					return new Response(JSON.stringify({ errors: [{ message: 'Forbidden' }] }), {
						status: 403,
						headers: { 'Content-Type': 'application/json' },
					});
				}
				throw new Error(`Unexpected fetch URL for capability failure test: ${url}`);
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
		expect(db.cfTokens.get(cfTokenId)?.verification_error).toContain('zones.analytics:read');
	});
});
