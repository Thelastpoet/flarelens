import { ConflictError, ForbiddenError, NotFoundError, PLAN_LIMITS, newId } from '@flarelens/shared';
import { z } from 'zod';
import { Hono } from 'hono';
import { Resend } from 'resend';
import { logAudit } from '../middleware/audit.js';
import type { AppContext } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { requireRole } from '../middleware/rbac.js';
import { reposMiddleware } from '../middleware/repos.js';
import { validate } from '../middleware/validate.js';

const InviteSchema = z.object({
	email: z.string().email(),
	role: z.enum(['editor', 'viewer']),
});

const UpdateRoleSchema = z.object({
	role: z.enum(['admin', 'editor', 'viewer']),
});

const INVITE_TTL = 60 * 60 * 24 * 7; // 7 days

const team = new Hono<AppContext>();
team.use('*', authMiddleware, reposMiddleware);

// GET /team/members
team.get('/members', rateLimit('reads'), async (c) => {
	const repos = c.get('repos');
	const members = await repos.teamMembers.list();
	return c.json({ members });
});

// POST /team/invites
team.post(
	'/invites',
	requireRole('admin'),
	rateLimit('writes'),
	validate(InviteSchema),
	async (c) => {
		const input = c.get('validatedBody') as z.infer<typeof InviteSchema>;
		const repos = c.get('repos');
		const session = c.get('session');
		const { CACHE, RESEND_API_KEY, WEB_URL } = c.env;

		// Check plan limits
		const account = await repos.accounts.findById();
		if (!account) throw new NotFoundError('Account');
		const plan = account.plan ?? 'free';
		const limit = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]?.max_team_members ?? 1;
		const count = await repos.teamMembers.count();
		if (count >= limit) {
			throw new ConflictError(
				`Your ${plan} plan allows a maximum of ${limit} team members. Upgrade to add more.`,
			);
		}

		// Check if already a member
		const existing = await repos.teamMembers.findByEmail(input.email);
		if (existing) throw new ConflictError('This email is already a team member or has a pending invite.');

		const memberId = newId();
		await repos.teamMembers.create({
			id: memberId,
			email: input.email,
			role: input.role,
			invited_by: session.user_id,
		});

		// Store invite token in KV
		const token = crypto.randomUUID().replace(/-/g, '');
		await CACHE.put(`invite:${token}`, JSON.stringify({ memberId, accountId: session.account_id }), {
			expirationTtl: INVITE_TTL,
		});

		const inviteUrl = `${WEB_URL}/accept-invite?token=${token}`;

		try {
			const resend = new Resend(RESEND_API_KEY);
			await resend.emails.send({
				from: 'FlareLens <noreply@flarelens.com>',
				to: [input.email],
				subject: "You've been invited to FlareLens",
				html: `
					<p>You've been invited to join a FlareLens account as <strong>${input.role}</strong>.</p>
					<p><a href="${inviteUrl}">Accept your invitation</a></p>
					<p>This link expires in 7 days.</p>
				`,
			});
		} catch (err) {
			console.error('[Team] Failed to send invite email:', err);
		}

		await logAudit(c, {
			action: 'create',
			entity_type: 'team',
			entity_id: memberId,
			description: `Invited ${input.email} as ${input.role}`,
		});

		return c.json({ success: true, member_id: memberId }, 201);
	},
);

// PATCH /team/members/:id/role
team.patch(
	'/members/:id/role',
	requireRole('admin'),
	rateLimit('writes'),
	validate(UpdateRoleSchema),
	async (c) => {
		const { id } = c.req.param();
		const { role } = c.get('validatedBody') as z.infer<typeof UpdateRoleSchema>;
		const repos = c.get('repos');
		const session = c.get('session');

		const member = await repos.teamMembers.findByUserId(session.user_id);
		if (member?.id === id) throw new ForbiddenError('You cannot change your own role.');

		const target = await repos.teamMembers.list().then((list) => list.find((m) => m.id === id));
		if (!target) throw new NotFoundError('Team member', id);

		await repos.teamMembers.updateRole(id, role);

		await logAudit(c, {
			action: 'update',
			entity_type: 'team',
			entity_id: id,
			description: `Changed role of ${target.email} to ${role}`,
		});

		return c.json({ success: true });
	},
);

// DELETE /team/members/:id
team.delete('/members/:id', requireRole('admin'), rateLimit('writes'), async (c) => {
	const { id } = c.req.param();
	const repos = c.get('repos');
	const session = c.get('session');

	const self = await repos.teamMembers.findByUserId(session.user_id);
	if (self?.id === id) throw new ForbiddenError('You cannot remove yourself from the team.');

	const target = await repos.teamMembers.list().then((list) => list.find((m) => m.id === id));
	if (!target) throw new NotFoundError('Team member', id);

	await repos.teamMembers.remove(id);

	await logAudit(c, {
		action: 'delete',
		entity_type: 'team',
		entity_id: id,
		description: `Removed team member ${target.email}`,
	});

	return c.json({ success: true });
});

// POST /team/invites/:id/resend
team.post('/invites/:id/resend', requireRole('admin'), rateLimit('writes'), async (c) => {
	const { id } = c.req.param();
	const repos = c.get('repos');
	const { CACHE, RESEND_API_KEY, WEB_URL } = c.env;

	const members = await repos.teamMembers.list();
	const member = members.find((m) => m.id === id && m.status === 'pending');
	if (!member) throw new NotFoundError('Pending invite', id);

	const token = crypto.randomUUID().replace(/-/g, '');
	await CACHE.put(`invite:${token}`, JSON.stringify({ memberId: id, accountId: member.account_id }), {
		expirationTtl: INVITE_TTL,
	});

	const inviteUrl = `${WEB_URL}/accept-invite?token=${token}`;

	try {
		const resend = new Resend(RESEND_API_KEY);
		await resend.emails.send({
			from: 'FlareLens <noreply@flarelens.com>',
			to: [member.email],
			subject: "You've been invited to FlareLens (reminder)",
			html: `
				<p>This is a reminder that you've been invited to join a FlareLens account as <strong>${member.role}</strong>.</p>
				<p><a href="${inviteUrl}">Accept your invitation</a></p>
				<p>This link expires in 7 days.</p>
			`,
		});
	} catch (err) {
		console.error('[Team] Failed to resend invite email:', err);
	}

	return c.json({ success: true });
});

export { team as teamRoutes };
