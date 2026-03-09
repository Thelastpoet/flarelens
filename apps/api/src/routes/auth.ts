import { ConflictError, NotFoundError, UnauthorizedError, ValidationError, newId } from '@flarelens/shared';
import type { Role } from '@flarelens/shared';
import {
	ForgotPasswordSchema,
	LoginSchema,
	RegisterSchema,
	ResetPasswordSchema,
	type ForgotPasswordInput,
	type LoginInput,
	type RegisterInput,
	type ResetPasswordInput,
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

	// Send verification email (best-effort)
	if (c.env.RESEND_API_KEY) {
		try {
			const verifyToken = crypto.randomUUID().replace(/-/g, '');
			await c.env.CACHE.put(`verify_email:${verifyToken}`, userId, { expirationTtl: 86400 });
			const verifyUrl = `${c.env.API_URL}/auth/verify-email?token=${verifyToken}`;
			const resend = new Resend(c.env.RESEND_API_KEY);
			await resend.emails.send({
				from: 'FlareLens <noreply@flarelens.com>',
				to: input.email,
				subject: 'Verify your FlareLens email',
				html: `<p>Hi ${input.name},</p><p>Please verify your email: <a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in 24 hours.</p>`,
			});
		} catch { /* non-critical */ }
	}

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

// POST /auth/accept-invite
auth.post('/accept-invite', async (c) => {
	const { DB, CACHE, SESSIONS } = c.env;
	const { token } = await c.req.json<{ token: string }>();

	if (!token) throw new ValidationError('Invite token is required');

	const raw = await CACHE.get(`invite:${token}`);
	if (!raw) throw new ValidationError('Invite token is invalid or has expired');

	const { memberId, accountId } = JSON.parse(raw) as { memberId: string; accountId: string };

	const { UsersRepository, TeamMembersRepository } = await import('@flarelens/db');

	// Find the pending team member
	const members = new TeamMembersRepository(DB, accountId);
	const member = await members.list().then((list) => list.find((m) => m.id === memberId));
	if (!member || member.status !== 'pending') {
		throw new ValidationError('This invite has already been accepted or is no longer valid');
	}

	// Find or create user by email
	const users = new UsersRepository(DB, accountId);
	let user = await users.findByEmail(member.email);

	if (!user) {
		// User doesn't exist yet — they need to register first, redirect with token preserved
		return c.json({ requires_registration: true, email: member.email, token });
	}

	// Accept the invite
	await members.accept(memberId, user.id);
	await CACHE.delete(`invite:${token}`);

	const { cookieHeader } = await createSession(SESSIONS, {
		user_id: user.id,
		account_id: accountId,
		role: member.role as Role,
	});

	c.header('Set-Cookie', cookieHeader);
	return c.json({
		user: {
			id: user.id,
			email: user.email,
			name: user.name,
			account_id: accountId,
			role: member.role,
		},
	});
});

// ─── OAuth ───────────────────────────────────────────────────────────────────

const OAUTH_PROVIDERS = {
	google: {
		authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
		tokenUrl: 'https://oauth2.googleapis.com/token',
		userUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
		scope: 'openid email profile',
	},
	github: {
		authUrl: 'https://github.com/login/oauth/authorize',
		tokenUrl: 'https://github.com/login/oauth/access_token',
		userUrl: 'https://api.github.com/user',
		scope: 'read:user user:email',
	},
} as const;

type OAuthProvider = keyof typeof OAUTH_PROVIDERS;

// GET /auth/oauth/:provider — initiate PKCE OAuth flow
auth.get('/oauth/:provider', async (c) => {
	const provider = c.req.param('provider') as OAuthProvider;
	const config = OAUTH_PROVIDERS[provider];
	if (!config) return c.json({ error: 'Unknown provider' }, 400);

	const clientId = provider === 'google' ? c.env.GOOGLE_CLIENT_ID : c.env.GITHUB_CLIENT_ID;
	if (!clientId) return c.json({ error: 'OAuth not configured' }, 501);

	// PKCE: code_verifier → code_challenge
	const verifierBytes = crypto.getRandomValues(new Uint8Array(32));
	const codeVerifier = btoa(String.fromCharCode(...verifierBytes))
		.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

	const challengeBuffer = await crypto.subtle.digest(
		'SHA-256',
		new TextEncoder().encode(codeVerifier),
	);
	const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(challengeBuffer)))
		.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

	const state = crypto.randomUUID();
	await c.env.CACHE.put(`oauth_state:${state}`, JSON.stringify({ codeVerifier, provider }), {
		expirationTtl: 600, // 10 min
	});

	const redirectUri = `${c.env.API_URL}/auth/oauth/${provider}/callback`;
	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: config.scope,
		state,
		...(provider === 'google'
			? { code_challenge: codeChallenge, code_challenge_method: 'S256' }
			: {}),
	});

	return c.redirect(`${config.authUrl}?${params.toString()}`);
});

// GET /auth/oauth/:provider/callback — exchange code, create session
auth.get('/oauth/:provider/callback', async (c) => {
	const provider = c.req.param('provider') as OAuthProvider;
	const config = OAUTH_PROVIDERS[provider];
	if (!config) return c.json({ error: 'Unknown provider' }, 400);

	const { code, state, error } = c.req.query() as Record<string, string>;
	if (error) return c.redirect(`${c.env.WEB_URL}/login?error=oauth_denied`);
	if (!code || !state) return c.redirect(`${c.env.WEB_URL}/login?error=oauth_invalid`);

	const stateRaw = await c.env.CACHE.get(`oauth_state:${state}`);
	if (!stateRaw) return c.redirect(`${c.env.WEB_URL}/login?error=oauth_expired`);

	const { codeVerifier } = JSON.parse(stateRaw) as { codeVerifier: string; provider: string };
	await c.env.CACHE.delete(`oauth_state:${state}`);

	const clientId = provider === 'google' ? c.env.GOOGLE_CLIENT_ID! : c.env.GITHUB_CLIENT_ID!;
	const clientSecret = provider === 'google' ? c.env.GOOGLE_CLIENT_SECRET! : c.env.GITHUB_CLIENT_SECRET!;
	const redirectUri = `${c.env.API_URL}/auth/oauth/${provider}/callback`;

	// Exchange code for access token
	const tokenRes = await fetch(config.tokenUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Accept: 'application/json',
		},
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			code,
			client_id: clientId,
			client_secret: clientSecret,
			redirect_uri: redirectUri,
			...(provider === 'google' ? { code_verifier: codeVerifier } : {}),
		}),
	});

	if (!tokenRes.ok) return c.redirect(`${c.env.WEB_URL}/login?error=oauth_token`);
	const tokenData = await tokenRes.json() as { access_token?: string };
	if (!tokenData.access_token) return c.redirect(`${c.env.WEB_URL}/login?error=oauth_token`);

	// Fetch user profile
	const userRes = await fetch(config.userUrl, {
		headers: {
			Authorization: `Bearer ${tokenData.access_token}`,
			Accept: 'application/json',
			'User-Agent': 'FlareLens',
		},
	});
	if (!userRes.ok) return c.redirect(`${c.env.WEB_URL}/login?error=oauth_user`);
	const profile = await userRes.json() as Record<string, unknown>;

	const email = (provider === 'google'
		? (profile['email'] as string)
		: await (async () => {
			// GitHub may need separate emails endpoint
			const em = profile['email'] as string | null;
			if (em) return em;
			const emailsRes = await fetch('https://api.github.com/user/emails', {
				headers: { Authorization: `Bearer ${tokenData.access_token}`, 'User-Agent': 'FlareLens' },
			});
			const emails = await emailsRes.json() as Array<{ email: string; primary: boolean; verified: boolean }>;
			return emails.find((e) => e.primary && e.verified)?.email ?? null;
		})());

	if (!email) return c.redirect(`${c.env.WEB_URL}/login?error=oauth_email`);

	const name = (profile['name'] as string | null) ?? (profile['login'] as string | null) ?? email.split('@')[0];
	const avatar_url = (profile['picture'] as string | null) ?? (profile['avatar_url'] as string | null) ?? null;

	const { DB, SESSIONS } = c.env;
	const { UsersRepository, AccountsRepository, TeamMembersRepository } = await import('@flarelens/db');

	const usersLookup = new UsersRepository(DB, 'oauth');
	let user = await usersLookup.findByEmail(email);

	if (!user) {
		// Auto-register
		const userId = newId();
		const accountId = newId();
		const accounts = new AccountsRepository(DB, accountId);
		await accounts.create({ id: accountId, name: `${name}'s Account` });
		await usersLookup.create({ id: userId, email, name, oauth_provider: provider });
		if (avatar_url) await usersLookup.updateProfile(userId, { avatar_url });
		const members = new TeamMembersRepository(DB, accountId);
		await members.create({ id: newId(), email, role: 'admin', invited_by: userId, user_id: userId });
		user = await usersLookup.findById(userId);
	}

	if (!user) return c.redirect(`${c.env.WEB_URL}/login?error=oauth_create`);

	const memberRow = await DB.prepare(
		"SELECT account_id, role FROM team_members WHERE user_id = ? AND status = 'active' ORDER BY CASE role WHEN 'admin' THEN 0 WHEN 'editor' THEN 1 ELSE 2 END LIMIT 1",
	).bind(user.id).first<{ account_id: string; role: string }>();

	if (!memberRow) return c.redirect(`${c.env.WEB_URL}/login?error=oauth_member`);

	const { cookieHeader } = await createSession(SESSIONS, {
		user_id: user.id,
		account_id: memberRow.account_id,
		role: memberRow.role as Role,
	});

	c.header('Set-Cookie', cookieHeader);
	return c.redirect(`${c.env.WEB_URL}/dashboard`);
});

// ─── Email Verification ───────────────────────────────────────────────────────

// GET /auth/verify-email?token=
auth.get('/verify-email', async (c) => {
	const { token } = c.req.query() as Record<string, string>;
	if (!token) return c.redirect(`${c.env.WEB_URL}/login?error=verify_invalid`);

	const key = `verify_email:${token}`;
	const userId = await c.env.CACHE.get(key);
	if (!userId) return c.redirect(`${c.env.WEB_URL}/login?error=verify_expired`);

	await c.env.CACHE.delete(key);

	const { UsersRepository } = await import('@flarelens/db');
	const users = new UsersRepository(c.env.DB, 'verify');
	await c.env.DB.prepare("UPDATE users SET email_verified = 1 WHERE id = ?").bind(userId).run();

	return c.redirect(`${c.env.WEB_URL}/dashboard?verified=1`);
});

export { auth as authRoutes };
