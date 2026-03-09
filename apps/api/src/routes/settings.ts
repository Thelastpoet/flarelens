import { Hono } from 'hono';
import { z } from 'zod';
import {
	UpdateProfileSchema,
	UpdateAccountSchema,
	UpdateNotificationPrefsSchema,
	type UpdateProfileInput,
	type UpdateAccountInput,
	type UpdateNotificationPrefsInput,
} from '@flarelens/shared/schemas/settings';
import { UnauthorizedError, ValidationError } from '@flarelens/shared';
import { validate } from '../middleware/validate.js';
import type { AppContext } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { reposMiddleware } from '../middleware/repos.js';
import { hashPassword, verifyPassword } from '../auth/password.js';

const settings = new Hono<AppContext>();
settings.use('*', authMiddleware, reposMiddleware);

// GET /settings/profile
settings.get('/profile', rateLimit('reads'), async (c) => {
	const repos = c.get('repos');
	const session = c.get('session');
	const user = await repos.users.findById(session.user_id);
	if (!user) throw new UnauthorizedError();
	return c.json({ id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url, email_verified: user.email_verified === 1 });
});

// PATCH /settings/profile
settings.patch('/profile', rateLimit('writes'), validate(UpdateProfileSchema), async (c) => {
	const input = c.get('validatedBody') as UpdateProfileInput;
	const repos = c.get('repos');
	const session = c.get('session');
	await repos.users.updateProfile(session.user_id, input);
	return c.json({ success: true });
});

// PATCH /settings/password
settings.patch(
	'/password',
	rateLimit('writes'),
	validate(z.object({ current_password: z.string(), new_password: z.string().min(8) })),
	async (c) => {
		const { current_password, new_password } = c.get('validatedBody') as { current_password: string; new_password: string };
		const repos = c.get('repos');
		const session = c.get('session');

		const user = await repos.users.findById(session.user_id);
		if (!user?.password_hash) throw new ValidationError('No password set on this account');

		const valid = await verifyPassword(current_password, user.password_hash);
		if (!valid) throw new ValidationError('Current password is incorrect');

		const password_hash = await hashPassword(new_password);
		await repos.users.updatePassword(session.user_id, password_hash);
		return c.json({ success: true });
	},
);

// GET /settings/notifications
settings.get('/notifications', rateLimit('reads'), async (c) => {
	const repos = c.get('repos');
	const account = await repos.accounts.findById();
	const raw = account?.settings ? JSON.parse(account.settings) as Record<string, unknown> : {};
	return c.json({
		email_enabled: raw['email_enabled'] ?? true,
		email_min_severity: raw['email_min_severity'] ?? 'warning',
		digest_enabled: raw['digest_enabled'] ?? false,
		digest_time: raw['digest_time'] ?? '08:00',
		in_app_enabled: raw['in_app_enabled'] ?? true,
	});
});

// PATCH /settings/notifications
settings.patch('/notifications', rateLimit('writes'), validate(UpdateNotificationPrefsSchema), async (c) => {
	const input = c.get('validatedBody') as UpdateNotificationPrefsInput;
	const repos = c.get('repos');
	const account = await repos.accounts.findById();
	if (!account) throw new UnauthorizedError();

	const existing = account.settings ? JSON.parse(account.settings) as Record<string, unknown> : {};
	const merged = { ...existing, ...input };
	await repos.accounts.updateSettings(merged);
	return c.json({ success: true });
});

// GET /settings/account
settings.get('/account', rateLimit('reads'), async (c) => {
	const repos = c.get('repos');
	const account = await repos.accounts.findById();
	if (!account) throw new UnauthorizedError();
	const accountSettings = account.settings ? JSON.parse(account.settings) as Record<string, unknown> : {};
	return c.json({ id: account.id, name: account.name, plan: account.plan, settings: accountSettings });
});

// PATCH /settings/account
settings.patch('/account', rateLimit('writes'), validate(UpdateAccountSchema), async (c) => {
	const input = c.get('validatedBody') as UpdateAccountInput;
	const repos = c.get('repos');
	const account = await repos.accounts.findById();
	if (!account) throw new UnauthorizedError();

	const existingSettings = account.settings ? JSON.parse(account.settings) as Record<string, unknown> : {};
	const updatedSettings = {
		...existingSettings,
		...(input.settings ?? {}),
		...(input.name ? { account_name: input.name } : {}),
	};
	await repos.accounts.updateSettings(updatedSettings);
	return c.json({ success: true });
});

export { settings as settingsRoutes };
