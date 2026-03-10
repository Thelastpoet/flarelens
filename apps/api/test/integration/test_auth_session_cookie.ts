import type { TeamMember, User } from '@flarelens/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { hashPassword } from '../../src/auth/password.js';
import { createTestApp } from '../helpers/app.js';
import { createTestEnv, FakeD1Database } from '../helpers/fakes.js';

const accountId = 'account_123';
const userId = 'user_123';

function makeUser(password_hash: string): User {
	return {
		id: userId,
		email: 'owner@example.com',
		email_verified: 1,
		password_hash,
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
		id: 'member_123',
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

describe('auth session cookie host handling', () => {
	let db: FakeD1Database;
	let app: ReturnType<typeof createTestApp>;

	beforeEach(async () => {
		db = new FakeD1Database();
		const passwordHash = await hashPassword('correct horse battery staple');
		db.insertUser(makeUser(passwordHash));
		db.insertTeamMember(makeMembership());
		app = createTestApp();
	});

	it('omits Secure for localhost login requests', async () => {
		const env = createTestEnv({ DB: db });
		const res = await app.fetch(
			new Request('http://localhost:5174/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 'owner@example.com',
					password: 'correct horse battery staple',
				}),
			}),
			env,
			{} as ExecutionContext,
		);

		expect(res.status).toBe(200);
		const setCookie = res.headers.get('Set-Cookie');
		expect(setCookie).toContain('__session=');
		expect(setCookie).not.toContain('Secure');
	});

	it('keeps Secure for non-localhost login requests', async () => {
		const env = createTestEnv({ DB: db, API_URL: 'https://api.example.com' });
		const res = await app.fetch(
			new Request('https://api.example.com/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: 'owner@example.com',
					password: 'correct horse battery staple',
				}),
			}),
			env,
			{} as ExecutionContext,
		);

		expect(res.status).toBe(200);
		expect(res.headers.get('Set-Cookie')).toContain('Secure');
	});
});
