import type { Account, TeamMember, User } from '@flarelens/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { createSession } from '../../src/auth/session.js';
import { createTestApp } from '../helpers/app.js';
import { createTestEnv, FakeD1Database } from '../helpers/fakes.js';

const accountId = 'acct_dev_tokens';
const adminId = 'user_admin';
const viewerId = 'user_viewer';

function makeAccount(): Account {
	return {
		id: accountId,
		name: 'Developer Tokens Account',
		plan: 'pro',
		plan_period_end: null,
		stripe_customer_id: null,
		settings: '{}',
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	};
}

function makeUser(id: string, email: string): User {
	return {
		id,
		email,
		email_verified: 1,
		password_hash: null,
		name: email.split('@')[0],
		avatar_url: null,
		oauth_provider: null,
		oauth_id: null,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	};
}

function makeMembership(id: string, userId: string, role: TeamMember['role']): TeamMember {
	return {
		id,
		account_id: accountId,
		user_id: userId,
		email: `${userId}@example.com`,
		role,
		status: 'active',
		invited_by: adminId,
		invited_at: new Date().toISOString(),
		accepted_at: new Date().toISOString(),
		last_active_at: null,
		created_at: new Date().toISOString(),
	};
}

describe('developer token security', () => {
	let db: FakeD1Database;
	let env: ReturnType<typeof createTestEnv>;
	let app: ReturnType<typeof createTestApp>;
	let adminCookie: string;
	let viewerCookie: string;

	beforeEach(async () => {
		db = new FakeD1Database();
		env = createTestEnv({ DB: db });
		app = createTestApp();

		db.insertAccount(makeAccount());
		db.insertUser(makeUser(adminId, 'admin@example.com'));
		db.insertUser(makeUser(viewerId, 'viewer@example.com'));
		db.insertTeamMember(makeMembership('member_admin', adminId, 'admin'));
		db.insertTeamMember(makeMembership('member_viewer', viewerId, 'viewer'));

		const adminSession = await createSession(
			env.SESSIONS,
			{ user_id: adminId, account_id: accountId, role: 'admin' },
			'localhost:5174',
		);
		adminCookie = adminSession.cookieHeader.split(';')[0];

		const viewerSession = await createSession(
			env.SESSIONS,
			{ user_id: viewerId, account_id: accountId, role: 'viewer' },
			'localhost:5174',
		);
		viewerCookie = viewerSession.cookieHeader.split(';')[0];
	});

	it('blocks non-admin users from listing or creating developer tokens', async () => {
		const listRes = await app.fetch(
			new Request('http://localhost:5174/developer/tokens', {
				headers: { Cookie: viewerCookie },
			}),
			env,
			{} as ExecutionContext,
		);
		expect(listRes.status).toBe(403);

		const createRes = await app.fetch(
			new Request('http://localhost:5174/developer/tokens', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Cookie: viewerCookie,
				},
				body: JSON.stringify({ name: 'viewer token' }),
			}),
			env,
			{} as ExecutionContext,
		);
		expect(createRes.status).toBe(403);
		expect(db.developerTokens.size).toBe(0);
	});

	it('allows admins to create developer tokens', async () => {
		const res = await app.fetch(
			new Request('http://localhost:5174/developer/tokens', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Cookie: adminCookie,
				},
				body: JSON.stringify({ name: 'deploy token' }),
			}),
			env,
			{} as ExecutionContext,
		);

		expect(res.status).toBe(201);
		const body = (await res.json()) as { token: string };
		expect(body.token.startsWith('flk_')).toBe(true);
		expect(db.developerTokens.size).toBe(1);
	});
});
