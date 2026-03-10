import type { Account, Notification, TeamMember, User } from '@flarelens/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { createSession } from '../../src/auth/session.js';
import { createTestApp } from '../helpers/app.js';
import { createTestEnv, FakeD1Database } from '../helpers/fakes.js';

const accountId = 'acct_api';
const userId = 'user_api';

function makeAccount(): Account {
	return {
		id: accountId,
		name: 'Original Account Name',
		plan: 'pro',
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
		id: 'member_api',
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

function makeNotification(): Notification {
	return {
		id: 'notif_private',
		account_id: accountId,
		user_id: 'someone_else',
		type: 'system',
		title: 'Private notification',
		body: 'Not yours',
		severity: 'warning',
		link: null,
		read: 0,
		archived: 0,
		created_at: new Date().toISOString(),
	};
}

describe('api consistency', () => {
	let db: FakeD1Database;
	let env: ReturnType<typeof createTestEnv>;
	let app: ReturnType<typeof createTestApp>;
	let sessionCookie: string;

	beforeEach(async () => {
		db = new FakeD1Database();
		env = createTestEnv({ DB: db });
		db.insertAccount(makeAccount());
		db.insertUser(makeUser());
		db.insertTeamMember(makeMembership());
		db.insertNotification(makeNotification());
		app = createTestApp();
		const { cookieHeader } = await createSession(
			env.SESSIONS,
			{ user_id: userId, account_id: accountId, role: 'admin' },
			'localhost:5174',
		);
		sessionCookie = cookieHeader.split(';')[0];
	});

	it('updates the actual account name column via PATCH /settings/account', async () => {
		const res = await app.fetch(
			new Request('http://localhost:5174/settings/account', {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
					Cookie: sessionCookie,
				},
				body: JSON.stringify({ name: 'Renamed Account' }),
			}),
			env,
			{} as ExecutionContext,
		);

		expect(res.status).toBe(200);
		expect(db.accounts.get(accountId)?.name).toBe('Renamed Account');
	});

	it('returns not found when a user tries to read-mark a notification they do not own', async () => {
		const res = await app.fetch(
			new Request('http://localhost:5174/notifications/notif_private/read', {
				method: 'PATCH',
				headers: { Cookie: sessionCookie },
			}),
			env,
			{} as ExecutionContext,
		);

		expect(res.status).toBe(404);
		expect(db.notifications.get('notif_private')?.read).toBe(0);
	});

	it('rejects invalid anomaly query pagination values', async () => {
		const res = await app.fetch(
			new Request('http://localhost:5174/anomalies?page=0', {
				headers: { Cookie: sessionCookie },
			}),
			env,
			{} as ExecutionContext,
		);

		expect(res.status).toBe(400);
	});
});
