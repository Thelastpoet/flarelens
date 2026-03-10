import type { CfToken, Mitigation, User } from '@flarelens/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encryptToken } from '../../src/auth/crypto.js';
import { createSession } from '../../src/auth/session.js';
import { createTestApp } from '../helpers/app.js';
import { createTestEnv, FakeD1Database } from '../helpers/fakes.js';

const accountId = 'acct_mitigation';
const userId = 'user_mitigation';
const mitigationId = 'mitigation_123';

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

function makeMitigation(actionConfig: Record<string, unknown>): Mitigation {
	return {
		id: mitigationId,
		account_id: accountId,
		name: 'Rate limit login floods',
		trigger_type: 'traffic_rate',
		trigger_condition: JSON.stringify({ metric: 'requests', operator: 'gt', threshold: 1000 }),
		action_type: 'rate_limit',
		action_config: JSON.stringify(actionConfig),
		resource_id: null,
		enabled: 1,
		last_triggered: null,
		trigger_count: 0,
		estimated_savings: 0,
		created_by: userId,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	};
}

async function makeVerifiedToken(encryptionKey: string): Promise<CfToken> {
	return {
		id: 'cftok_mitigation',
		account_id: accountId,
		label: 'Primary token',
		encrypted_token: await encryptToken('cf-secret-token', encryptionKey),
		cf_account_id: 'cf_account_123',
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

describe('mitigation route safety', () => {
	let db: FakeD1Database;
	let env: ReturnType<typeof createTestEnv>;
	let app: ReturnType<typeof createTestApp>;
	let sessionCookie: string;

	beforeEach(async () => {
		vi.restoreAllMocks();
		db = new FakeD1Database();
		env = createTestEnv({ DB: db });
		db.insertUser(makeUser());
		db.insertCfToken(await makeVerifiedToken(env.TOKEN_ENCRYPTION_KEY));
		app = createTestApp();

		const { cookieHeader } = await createSession(
			env.SESSIONS,
			{ user_id: userId, account_id: accountId, role: 'admin' },
			'localhost:5174',
		);
		sessionCookie = cookieHeader.split(';')[0];
	});

	it('rejects new block_ua mitigations at validation time', async () => {
		const res = await app.fetch(
			new Request('http://localhost:5174/mitigations', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Cookie: sessionCookie,
				},
				body: JSON.stringify({
					name: 'Block bot',
					trigger_type: 'traffic_rate',
					trigger_condition: { metric: 'requests', operator: 'gt', threshold: 1000 },
					action_type: 'block_ua',
					action_config: {
						zone_id: 'zone_123',
						user_agent: 'BadBot/1.0',
					},
				}),
			}),
			env,
			{} as ExecutionContext,
		);

		expect(res.status).toBe(400);
	});

	it('defaults manual triggers to dry-run and records audit metadata', async () => {
		db.insertMitigation(
			makeMitigation({
				zone_id: 'zone_123',
				threshold: 250,
				period: 60,
			}),
		);

		const fetchSpy = vi.fn();
		vi.stubGlobal('fetch', fetchSpy);

		const res = await app.fetch(
			new Request(`http://localhost:5174/mitigations/${mitigationId}/trigger`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Cookie: sessionCookie,
				},
				body: JSON.stringify({}),
			}),
			env,
			{} as ExecutionContext,
		);

		expect(res.status).toBe(200);
		const body = (await res.json()) as { dry_run: boolean; executed: boolean };
		expect(body.dry_run).toBe(true);
		expect(body.executed).toBe(false);
		expect(fetchSpy).not.toHaveBeenCalled();
		expect(db.mitigations.get(mitigationId)?.trigger_count).toBe(0);
		expect(JSON.parse(db.auditLogs[0].metadata)).toMatchObject({
			dry_run: true,
			executed: false,
			provider_action: 'zone_rate_limit',
		});
	});

	it('requires explicit confirmation before performing a live mitigation', async () => {
		db.insertMitigation(
			makeMitigation({
				zone_id: 'zone_123',
				threshold: 250,
				period: 60,
				dry_run: false,
			}),
		);

		const res = await app.fetch(
			new Request(`http://localhost:5174/mitigations/${mitigationId}/trigger`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Cookie: sessionCookie,
				},
				body: JSON.stringify({ dry_run: false }),
			}),
			env,
			{} as ExecutionContext,
		);

		expect(res.status).toBe(400);
		expect(db.mitigations.get(mitigationId)?.trigger_count).toBe(0);
	});

	it('sends a real Cloudflare mitigation request only when confirmation is explicit', async () => {
		db.insertMitigation(
			makeMitigation({
				zone_id: 'zone_123',
				threshold: 500,
				period: 120,
				url_pattern: 'example.com/login*',
				action_mode: 'ban',
				mitigation_timeout: 600,
				dry_run: false,
			}),
		);

		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
				const url = String(input);
				if (url.endsWith('/zones/zone_123/rate_limits')) {
					expect(init?.method).toBe('POST');
					expect(JSON.parse(String(init?.body))).toEqual({
						match: { request: { url: 'example.com/login*' } },
						threshold: 500,
						period: 120,
						action: { mode: 'ban', timeout: 600 },
						description: 'FlareLens auto rate limit',
					});
					return Response.json({ success: true, result: { id: 'rl_123' } });
				}
				throw new Error(`Unexpected fetch URL in live mitigation test: ${url}`);
			}),
		);

		const res = await app.fetch(
			new Request(`http://localhost:5174/mitigations/${mitigationId}/trigger`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Cookie: sessionCookie,
				},
				body: JSON.stringify({ dry_run: false, confirm: true }),
			}),
			env,
			{} as ExecutionContext,
		);

		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			dry_run: boolean;
			executed: boolean;
			provider_reference: string | null;
		};
		expect(body.dry_run).toBe(false);
		expect(body.executed).toBe(true);
		expect(body.provider_reference).toBe('rl_123');
		expect(db.mitigations.get(mitigationId)?.trigger_count).toBe(1);
		expect(JSON.parse(db.auditLogs[0].metadata)).toMatchObject({
			dry_run: false,
			executed: true,
			provider_reference: 'rl_123',
		});
	});
});
