import type { Account, TeamMember, User } from '@flarelens/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { createSession } from '../../src/auth/session.js';
import { createTestApp } from '../helpers/app.js';
import { createTestEnv, FakeD1Database } from '../helpers/fakes.js';

const accountId = 'acct_billing';
const userId = 'user_billing';

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

function makeAccount(settings: Record<string, unknown> = {}): Account {
	return {
		id: accountId,
		name: 'Billing Account',
		plan: 'pro',
		plan_period_end: null,
		stripe_customer_id: null,
		settings: JSON.stringify(settings),
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	};
}

function makeMembership(): TeamMember {
	return {
		id: 'member_billing',
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

describe('billing endpoints', () => {
	let db: FakeD1Database;
	let env: ReturnType<typeof createTestEnv>;
	let app: ReturnType<typeof createTestApp>;
	let sessionCookie: string;

	beforeEach(async () => {
		db = new FakeD1Database();
		env = createTestEnv({ DB: db });
		db.insertUser(makeUser());
		db.insertAccount(makeAccount());
		db.insertTeamMember(makeMembership());
		app = createTestApp();

		const { cookieHeader } = await createSession(
			env.SESSIONS,
			{ user_id: userId, account_id: accountId, role: 'admin' },
			'localhost:5174',
		);
		sessionCookie = cookieHeader.split(';')[0];
	});

	it('returns an honest empty estimated state when no billing data exists', async () => {
		const res = await app.fetch(
			new Request('http://localhost:5174/billing/overview', {
				headers: { Cookie: sessionCookie },
			}),
			env,
			{} as ExecutionContext,
		);

		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			source: string;
			is_estimated: boolean;
			current_estimated_spend: number;
			breakdown: Record<string, number>;
		};
		expect(body.source).toBe('none');
		expect(body.is_estimated).toBe(true);
		expect(body.current_estimated_spend).toBe(0);
		expect(body.breakdown).toEqual({});
	});

	it('reads and updates budget limits from account settings without requiring a billing snapshot', async () => {
		const patchRes = await app.fetch(
			new Request('http://localhost:5174/billing/budget', {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Cookie: sessionCookie,
				},
				body: JSON.stringify({ limit: 250 }),
			}),
			env,
			{} as ExecutionContext,
		);

		expect(patchRes.status).toBe(200);
		expect(JSON.parse(db.accounts.get(accountId)?.settings ?? '{}')).toMatchObject({
			budget_limit: 250,
		});
		expect(JSON.parse(db.auditLogs[0].metadata)).toMatchObject({
			budget_limit: 250,
			source: 'account_settings',
		});

		const getRes = await app.fetch(
			new Request('http://localhost:5174/billing/budget', {
				headers: { Cookie: sessionCookie },
			}),
			env,
			{} as ExecutionContext,
		);

		expect(getRes.status).toBe(200);
		const body = (await getRes.json()) as {
			budget_limit: number | null;
			current_estimated_spend: number;
			is_estimated: boolean;
		};
		expect(body.budget_limit).toBe(250);
		expect(body.current_estimated_spend).toBe(0);
		expect(body.is_estimated).toBe(true);
	});

	it('prefers imported billing snapshots when they exist and labels the source clearly', async () => {
		db.insertBillingSnapshot({
			id: 'bill_current',
			account_id: accountId,
			period_start: '2026-03-01T00:00:00.000Z',
			period_end: '2026-03-31T23:59:59.000Z',
			total_cost: 90,
			breakdown: JSON.stringify({ workers: 55, cdn: 35 }),
			budget_limit: null,
			status: 'active',
			stripe_invoice_id: null,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		});

		const res = await app.fetch(
			new Request('http://localhost:5174/billing/overview', {
				headers: { Cookie: sessionCookie },
			}),
			env,
			{} as ExecutionContext,
		);

		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			source: string;
			is_estimated: boolean;
			current_estimated_spend: number;
			breakdown: Record<string, number>;
		};
		expect(body.source).toBe('billing_snapshot');
		expect(body.is_estimated).toBe(false);
		expect(body.current_estimated_spend).toBe(90);
		expect(body.breakdown).toEqual({ workers: 55, cdn: 35 });
	});
});
