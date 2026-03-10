import type { Account, TeamMember, User } from '@flarelens/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashPassword } from '../../src/auth/password.js';
import { createTestApp } from '../helpers/app.js';
import { createTestEnv, FakeD1Database } from '../helpers/fakes.js';

const accountId = 'acct_identity';
const existingUserId = 'user_existing';

function makeAccount(): Account {
	return {
		id: accountId,
		name: 'Identity Account',
		plan: 'pro',
		plan_period_end: null,
		stripe_customer_id: null,
		settings: '{}',
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	};
}

function makeExistingUser(password_hash: string): User {
	return {
		id: existingUserId,
		email: 'existing@example.com',
		email_verified: 1,
		password_hash,
		name: 'Existing User',
		avatar_url: null,
		oauth_provider: null,
		oauth_id: null,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	};
}

function makePendingMember(email: string, id: string): TeamMember {
	return {
		id,
		account_id: accountId,
		user_id: null,
		email,
		role: 'viewer',
		status: 'pending',
		invited_by: existingUserId,
		invited_at: new Date().toISOString(),
		accepted_at: null,
		last_active_at: null,
		created_at: new Date().toISOString(),
	};
}

function makeActiveMember(email: string): TeamMember {
	return {
		id: 'member_active_existing',
		account_id: accountId,
		user_id: existingUserId,
		email,
		role: 'admin',
		status: 'active',
		invited_by: existingUserId,
		invited_at: new Date().toISOString(),
		accepted_at: new Date().toISOString(),
		last_active_at: null,
		created_at: new Date().toISOString(),
	};
}

describe('auth identity flows', () => {
	let db: FakeD1Database;
	let env: ReturnType<typeof createTestEnv>;
	let app: ReturnType<typeof createTestApp>;

	beforeEach(async () => {
		vi.restoreAllMocks();
		db = new FakeD1Database();
		env = createTestEnv({
			DB: db,
			GOOGLE_CLIENT_ID: 'google-client',
			GOOGLE_CLIENT_SECRET: 'google-secret',
		});
		db.insertAccount(makeAccount());
		const passwordHash = await hashPassword('correct horse battery staple');
		db.insertUser(makeExistingUser(passwordHash));
		db.insertTeamMember(makeActiveMember('existing@example.com'));
		app = createTestApp();
	});

	it('does not create a session for an existing invited user until they authenticate', async () => {
		db.insertTeamMember(makePendingMember('existing@example.com', 'member_pending_existing'));
		await env.CACHE.put(
			'invite:invite_existing',
			JSON.stringify({ memberId: 'member_pending_existing', accountId }),
		);

		const res = await app.fetch(
			new Request('http://localhost:5174/auth/accept-invite', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token: 'invite_existing' }),
			}),
			env,
			{} as ExecutionContext,
		);

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			requires_login: true,
			email: 'existing@example.com',
			token: 'invite_existing',
		});
		expect(res.headers.get('Set-Cookie')).toBeNull();
		expect(db.teamMembers.get('member_pending_existing')?.status).toBe('pending');
	});

	it('completes invite acceptance for a brand-new user without creating a separate account', async () => {
		db.insertTeamMember(makePendingMember('new-user@example.com', 'member_pending_new'));
		await env.CACHE.put(
			'invite:invite_new',
			JSON.stringify({ memberId: 'member_pending_new', accountId }),
		);

		const res = await app.fetch(
			new Request('http://localhost:5174/auth/accept-invite', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					token: 'invite_new',
					name: 'New User',
					password: 'correct horse battery staple',
					confirm_password: 'correct horse battery staple',
				}),
			}),
			env,
			{} as ExecutionContext,
		);

		expect(res.status).toBe(200);
		const body = (await res.json()) as { user: { account_id: string; email: string } };
		expect(body.user.account_id).toBe(accountId);
		expect(body.user.email).toBe('new-user@example.com');
		expect([...db.accounts.values()]).toHaveLength(1);
		expect(db.teamMembers.get('member_pending_new')?.status).toBe('active');
		expect(res.headers.get('Set-Cookie')).toContain('__session=');
	});

	it('links oauth logins to provider subject identities for existing users', async () => {
		await env.CACHE.put(
			'oauth_state:state_123',
			JSON.stringify({ codeVerifier: 'verifier_123', provider: 'google' }),
		);

		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: RequestInfo | URL) => {
				const url = String(input);
				if (url.startsWith('https://oauth2.googleapis.com/token')) {
					return Response.json({ access_token: 'oauth_access_token' });
				}
				if (url.startsWith('https://www.googleapis.com/oauth2/v3/userinfo')) {
					return Response.json({
						sub: 'google-sub-123',
						email: 'existing@example.com',
						name: 'Existing User',
					});
				}
				throw new Error(`Unexpected fetch URL in oauth identity test: ${url}`);
			}),
		);

		const res = await app.fetch(
			new Request(
				'http://localhost:5174/auth/oauth/google/callback?code=oauth_code&state=state_123',
			),
			env,
			{} as ExecutionContext,
		);

		expect(res.status).toBe(302);
		expect(res.headers.get('Location')).toBe('http://localhost:5173/dashboard');
		expect(db.users.get(existingUserId)?.oauth_provider).toBe('google');
		expect(db.users.get(existingUserId)?.oauth_id).toBe('google-sub-123');
	});
});
