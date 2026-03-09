import type {
	ForgotPasswordInput,
	LoginInput,
	RegisterInput,
	ResetPasswordInput,
	Role,
} from '@flarelens/shared';
import {
	ConflictError,
	NotFoundError,
	newId,
	UnauthorizedError,
	ValidationError,
} from '@flarelens/shared';
import {
	ForgotPasswordSchema,
	LoginSchema,
	RegisterSchema,
	ResetPasswordSchema,
} from '@flarelens/shared/schemas/auth';
import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { Resend } from 'resend';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { clearSessionCookie, createSession, destroySession } from '../auth/session.js';
import type { AppContext } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimitByIp } from '../middleware/rate-limit.js';
import { reposMiddleware } from '../middleware/repos.js';
import { validate } from '../middleware/validate.js';

const auth = new Hono<AppContext>();

// POST /auth/register
auth.post('/register', rateLimitByIp('auth'), validate(RegisterSchema), async (c) => {
	const input = c.get('validatedBody') as RegisterInput;
	const { DB, SESSIONS } = c.env;

	// Temporarily create repos without account_id for registration
	const { UsersRepository, AccountsRepository, TeamMembersRepository } = await import(
		'@flarelens/db'
	);
	const TEMP_ID = 'register';
	const users = new UsersRepository(DB, TEMP_ID);
	const existingUser = await users.findByEmail(input.email);
	if (existingUser) throw new ConflictError('An account with this email already exists');

	const userId = newId();
	const accountId = newId();
	const memberId = newId();
	const password_hash = await hashPassword(input.password);

	// Create account, user, team_member in sequence (D1 doesn't support batch transactions easily)
	const accounts = new AccountsRepository(DB, accountId);
	await accounts.create({ id: accountId, name: `${input.name}'s Account` });

	await users.create({ id: userId, email: input.email, name: input.name, password_hash });

	const members = new TeamMembersRepository(DB, accountId);
	await members.create({
		id: memberId,
		email: input.email,
		role: 'admin',
		invited_by: userId,
		user_id: userId,
	});

	const { cookieHeader } = await createSession(SESSIONS, {
		user_id: userId,
		account_id: accountId,
		role: 'admin',
	});

	c.header('Set-Cookie', cookieHeader);
	return c.json(
		{
			user: {
				id: userId,
				email: input.email,
				name: input.name,
				account_id: accountId,
				role: 'admin',
			},
		},
		201,
	);
});

// POST /auth/login
auth.post('/login', rateLimitByIp('auth'), validate(LoginSchema), async (c) => {
	const input = c.get('validatedBody') as LoginInput;
	const { DB, SESSIONS } = c.env;

	const { UsersRepository, TeamMembersRepository } = await import('@flarelens/db');
	const users = new UsersRepository(DB, 'login');
	const user = await users.findByEmail(input.email);
	if (!user || !user.password_hash) throw new UnauthorizedError('Invalid email or password');

	const valid = await verifyPassword(input.password, user.password_hash);
	if (!valid) throw new UnauthorizedError('Invalid email or password');

	// Find account membership — first admin role preferred
	const memberRow = await DB.prepare(
		"SELECT account_id, role FROM team_members WHERE user_id = ? AND status = 'active' ORDER BY CASE role WHEN 'admin' THEN 0 WHEN 'editor' THEN 1 ELSE 2 END LIMIT 1",
	)
		.bind(user.id)
		.first<{ account_id: string; role: string }>();

	if (!memberRow) throw new UnauthorizedError('No active account found');

	const members = new TeamMembersRepository(DB, memberRow.account_id);
	await members.updateLastActive((await members.findByUserId(user.id))?.id ?? '');

	const { cookieHeader } = await createSession(SESSIONS, {
		user_id: user.id,
		account_id: memberRow.account_id,
		role: memberRow.role as Role,
	});

	c.header('Set-Cookie', cookieHeader);
	return c.json({
		user: {
			id: user.id,
			email: user.email,
			name: user.name,
			account_id: memberRow.account_id,
			role: memberRow.role,
		},
	});
});

// POST /auth/logout
auth.post('/logout', async (c) => {
	const token = getCookie(c, '__session');
	if (token) await destroySession(c.env.SESSIONS, token);
	c.header('Set-Cookie', clearSessionCookie());
	return c.json({ success: true });
});

// GET /auth/me
auth.get('/me', authMiddleware, reposMiddleware, async (c) => {
	const session = c.get('session');
	const repos = c.get('repos');

	const [user, account, member] = await Promise.all([
		repos.users.findById(session.user_id),
		repos.accounts.findById(),
		repos.teamMembers.findByUserId(session.user_id),
	]);

	if (!user || !account) throw new NotFoundError('User');

	return c.json({
		id: user.id,
		email: user.email,
		name: user.name,
		avatar_url: user.avatar_url,
		email_verified: user.email_verified === 1,
		account: {
			id: account.id,
			name: account.name,
			plan: account.plan,
		},
		role: member?.role ?? session.role,
	});
});

// POST /auth/forgot-password
auth.post('/forgot-password', rateLimitByIp('auth'), validate(ForgotPasswordSchema), async (c) => {
	const input = c.get('validatedBody') as ForgotPasswordInput;
	const { DB, CACHE, RESEND_API_KEY, WEB_URL } = c.env;

	const { UsersRepository } = await import('@flarelens/db');
	const users = new UsersRepository(DB, 'reset');
	const user = await users.findByEmail(input.email);

	// Always return success to prevent email enumeration
	if (!user) return c.json({ success: true });

	const token = crypto.randomUUID().replace(/-/g, '');
	const key = `pw_reset:${token}`;
	await CACHE.put(key, user.id, { expirationTtl: 3600 }); // 1 hour TTL

	const resetUrl = `${WEB_URL}/reset-password?token=${token}`;

	try {
		const resend = new Resend(RESEND_API_KEY);
		await resend.emails.send({
			from: 'FlareLens <noreply@flarelens.com>',
			to: input.email,
			subject: 'Reset your FlareLens password',
			html: `
				<p>Hi ${user.name},</p>
				<p>You requested a password reset. Click the link below to set a new password:</p>
				<p><a href="${resetUrl}">${resetUrl}</a></p>
				<p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
			`,
		});
	} catch (err) {
		console.error('[Auth] Failed to send reset email:', err);
	}

	return c.json({ success: true });
});

// POST /auth/reset-password
auth.post('/reset-password', rateLimitByIp('auth'), validate(ResetPasswordSchema), async (c) => {
	const input = c.get('validatedBody') as ResetPasswordInput;
	const { DB, CACHE } = c.env;

	const key = `pw_reset:${input.token}`;
	const userId = await CACHE.get(key);
	if (!userId) throw new ValidationError('Reset token is invalid or has expired');

	const { UsersRepository } = await import('@flarelens/db');
	const users = new UsersRepository(DB, 'reset');
	const user = await users.findById(userId);
	if (!user) throw new NotFoundError('User');

	const password_hash = await hashPassword(input.password);
	await users.updatePassword(userId, password_hash);
	await CACHE.delete(key);

	return c.json({ success: true });
});

export { auth as authRoutes };
