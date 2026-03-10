import type { Account, TeamMember, User } from '@flarelens/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSession } from '../../src/auth/session.js';
import { createTestApp } from '../helpers/app.js';
import { createTestEnv, FakeD1Database } from '../helpers/fakes.js';

const accountId = 'acct_integrations';
const userId = 'user_integrations';

function makeAccount(): Account {
	return {
		id: accountId,
		name: 'Integration Account',
		plan: 'free',
		plan_period_end: null,
		stripe_customer_id: null,
		settings: '{}',
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	};
}

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

function makeMembership(): TeamMember {
	return {
		id: 'member_integrations',
		account_id: accountId,
		user_id: userId,
		email: 'owner@example.com',
		role: 'admin',
		status: 'active',
		invited_by: userId,
		invited_at: new Date().toISOString(),
		accepted_at: new Date().toISOString(),
		last_active_at: null,
		created_at: new Date().toISOString(),
	};
}

describe('integration routes', () => {
	let db: FakeD1Database;
	let env: ReturnType<typeof createTestEnv>;
	let app: ReturnType<typeof createTestApp>;
	let sessionCookie: string;

	beforeEach(async () => {
		vi.restoreAllMocks();
		db = new FakeD1Database();
		env = createTestEnv({ DB: db });
		db.insertAccount(makeAccount());
		db.insertUser(makeUser());
		db.insertTeamMember(makeMembership());
		app = createTestApp();

		const { cookieHeader } = await createSession(
			env.SESSIONS,
			{ user_id: userId, account_id: accountId, role: 'admin' },
			'localhost:5174',
		);
		sessionCookie = cookieHeader.split(';')[0];
	});

	it('enforces the plan limit on webhook integrations', async () => {
		const first = await app.fetch(
			new Request('http://localhost:5174/integrations/webhooks', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Cookie: sessionCookie,
				},
				body: JSON.stringify({
					name: 'Primary webhook',
					url: 'https://example.com/one',
				}),
			}),
			env,
			{} as ExecutionContext,
		);
		expect(first.status).toBe(201);

		const second = await app.fetch(
			new Request('http://localhost:5174/integrations/webhooks', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Cookie: sessionCookie,
				},
				body: JSON.stringify({
					name: 'Second webhook',
					url: 'https://example.com/two',
				}),
			}),
			env,
			{} as ExecutionContext,
		);

		expect(second.status).toBe(400);
		expect(db.integrations.size).toBe(1);
	});

	it('records an audit log when an integration test fails', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: RequestInfo | URL) => {
				if (String(input) === 'https://example.com/fail') {
					return new Response('boom', { status: 500 });
				}
				throw new Error(`Unexpected fetch URL in integration route test: ${String(input)}`);
			}),
		);

		const create = await app.fetch(
			new Request('http://localhost:5174/integrations/webhooks', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Cookie: sessionCookie,
				},
				body: JSON.stringify({
					name: 'Failing webhook',
					url: 'https://example.com/fail',
				}),
			}),
			env,
			{} as ExecutionContext,
		);
		expect(create.status).toBe(201);
		const createBody = (await create.json()) as { id: string };

		const res = await app.fetch(
			new Request(`http://localhost:5174/integrations/webhook/test?id=${createBody.id}`, {
				method: 'POST',
				headers: {
					Cookie: sessionCookie,
				},
			}),
			env,
			{} as ExecutionContext,
		);

		expect(res.status).toBe(400);
		expect(db.auditLogs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					entity_type: 'integration',
					entity_id: createBody.id,
					description: 'Integration test failed for webhook "Failing webhook"',
				}),
			]),
		);
		expect(JSON.parse(db.auditLogs.at(-1)?.metadata ?? '{}')).toMatchObject({
			outcome: 'failed',
			integration_type: 'webhook',
		});
	});
});
