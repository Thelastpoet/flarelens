import { NotFoundError, newId, PLAN_LIMITS, ValidationError } from '@flarelens/shared';
import {
	type DiscordIntegrationInput,
	DiscordIntegrationSchema,
	type PagerDutyIntegrationInput,
	PagerDutyIntegrationSchema,
	type SlackIntegrationInput,
	SlackIntegrationSchema,
	type TeamsIntegrationInput,
	TeamsIntegrationSchema,
	type WebhookIntegrationInput,
	WebhookIntegrationSchema,
} from '@flarelens/shared/schemas/integrations';
import { Hono } from 'hono';
import { decryptToken, encryptToken } from '../auth/crypto.js';
import { logAudit } from '../middleware/audit.js';
import type { AppContext } from '../middleware/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { requireRole } from '../middleware/rbac.js';
import { reposMiddleware } from '../middleware/repos.js';
import { validate } from '../middleware/validate.js';
import { testDiscordWebhook } from '../services/alerts/channels/discord.js';
import { testPagerDutyIntegration } from '../services/alerts/channels/pagerduty.js';
import { testSlackWebhook } from '../services/alerts/channels/slack.js';
import { testTeamsWebhook } from '../services/alerts/channels/teams.js';
import { testWebhook } from '../services/alerts/channels/webhook.js';

const integrations = new Hono<AppContext>();
integrations.use('*', authMiddleware, reposMiddleware);

// GET /integrations
integrations.get('/', rateLimit('reads'), async (c) => {
	const repos = c.get('repos');
	const list = await repos.integrations.list();
	// Strip encrypted config from response
	const safe = list.map(({ config: _config, ...rest }) => rest);
	return c.json({ integrations: safe });
});

// POST /integrations/slack
integrations.post(
	'/slack',
	requireRole('admin', 'editor'),
	rateLimit('writes'),
	validate(SlackIntegrationSchema),
	async (c) => {
		const input = c.get('validatedBody') as SlackIntegrationInput;
		const repos = c.get('repos');
		const { TOKEN_ENCRYPTION_KEY } = c.env;

		const account = await repos.accounts.findById();
		const limit = PLAN_LIMITS[account?.plan as keyof typeof PLAN_LIMITS]?.max_integrations ?? 1;
		const existing = await repos.integrations.list();
		if (existing.length >= limit)
			throw new ValidationError(
				`Plan limit reached: max ${limit} integration${limit === 1 ? '' : 's'}`,
			);

		const encryptedUrl = await encryptToken(input.webhook_url, TOKEN_ENCRYPTION_KEY);
		const integration = await repos.integrations.upsert({
			id: newId(),
			type: 'slack',
			name: input.name,
			config: { encrypted_webhook_url: encryptedUrl },
		});

		await logAudit(c, {
			action: 'create',
			entity_type: 'integration',
			entity_id: integration.id,
			description: 'Configured Slack integration',
		});
		return c.json({ success: true, id: integration.id }, 201);
	},
);

// POST /integrations/discord
integrations.post(
	'/discord',
	requireRole('admin', 'editor'),
	rateLimit('writes'),
	validate(DiscordIntegrationSchema),
	async (c) => {
		const input = c.get('validatedBody') as DiscordIntegrationInput;
		const repos = c.get('repos');
		const { TOKEN_ENCRYPTION_KEY } = c.env;

		const encryptedUrl = await encryptToken(input.webhook_url, TOKEN_ENCRYPTION_KEY);
		const integration = await repos.integrations.upsert({
			id: newId(),
			type: 'discord',
			name: input.name,
			config: { encrypted_webhook_url: encryptedUrl },
		});

		await logAudit(c, {
			action: 'create',
			entity_type: 'integration',
			entity_id: integration.id,
			description: 'Configured Discord integration',
		});
		return c.json({ success: true, id: integration.id }, 201);
	},
);

// POST /integrations/pagerduty
integrations.post(
	'/pagerduty',
	requireRole('admin', 'editor'),
	rateLimit('writes'),
	validate(PagerDutyIntegrationSchema),
	async (c) => {
		const input = c.get('validatedBody') as PagerDutyIntegrationInput;
		const repos = c.get('repos');
		const { TOKEN_ENCRYPTION_KEY } = c.env;

		const encryptedKey = await encryptToken(input.routing_key, TOKEN_ENCRYPTION_KEY);
		const integration = await repos.integrations.upsert({
			id: newId(),
			type: 'pagerduty',
			name: input.name,
			config: { encrypted_routing_key: encryptedKey, severity_map: input.severity_map },
		});

		await logAudit(c, {
			action: 'create',
			entity_type: 'integration',
			entity_id: integration.id,
			description: 'Configured PagerDuty integration',
		});
		return c.json({ success: true, id: integration.id }, 201);
	},
);

// POST /integrations/teams
integrations.post(
	'/teams',
	requireRole('admin', 'editor'),
	rateLimit('writes'),
	validate(TeamsIntegrationSchema),
	async (c) => {
		const input = c.get('validatedBody') as TeamsIntegrationInput;
		const repos = c.get('repos');
		const { TOKEN_ENCRYPTION_KEY } = c.env;

		const encryptedUrl = await encryptToken(input.webhook_url, TOKEN_ENCRYPTION_KEY);
		const integration = await repos.integrations.upsert({
			id: newId(),
			type: 'teams',
			name: input.name,
			config: { encrypted_webhook_url: encryptedUrl },
		});

		await logAudit(c, {
			action: 'create',
			entity_type: 'integration',
			entity_id: integration.id,
			description: 'Configured MS Teams integration',
		});
		return c.json({ success: true, id: integration.id }, 201);
	},
);

// GET /integrations/webhooks
integrations.get('/webhooks', rateLimit('reads'), async (c) => {
	const repos = c.get('repos');
	const webhooks = await repos.integrations.listWebhooks();
	const safe = webhooks.map(({ config: _config, ...rest }) => rest);
	return c.json({ webhooks: safe });
});

// POST /integrations/webhooks
integrations.post(
	'/webhooks',
	requireRole('admin', 'editor'),
	rateLimit('writes'),
	validate(WebhookIntegrationSchema),
	async (c) => {
		const input = c.get('validatedBody') as WebhookIntegrationInput;
		const repos = c.get('repos');
		const { TOKEN_ENCRYPTION_KEY } = c.env;

		const encryptedUrl = await encryptToken(input.url, TOKEN_ENCRYPTION_KEY);
		const encryptedSecret = input.secret
			? await encryptToken(input.secret, TOKEN_ENCRYPTION_KEY)
			: null;

		const id = newId();
		const integration = await repos.integrations.create({
			id,
			type: 'webhook',
			name: input.name,
			config: {
				encrypted_url: encryptedUrl,
				encrypted_secret: encryptedSecret,
				headers: input.headers ?? {},
			},
		});

		await logAudit(c, {
			action: 'create',
			entity_type: 'integration',
			entity_id: id,
			description: `Created webhook "${input.name}"`,
		});
		return c.json({ success: true, id: integration.id }, 201);
	},
);

// PATCH /integrations/webhooks/:id
integrations.patch(
	'/webhooks/:id',
	requireRole('admin', 'editor'),
	rateLimit('writes'),
	validate(WebhookIntegrationSchema.partial()),
	async (c) => {
		const { id } = c.req.param();
		const input = c.get('validatedBody') as Partial<WebhookIntegrationInput>;
		const repos = c.get('repos');
		const { TOKEN_ENCRYPTION_KEY } = c.env;

		const existing = await repos.integrations.findById(id);
		if (!existing) throw new NotFoundError('Webhook', id);

		const configUpdates: Record<string, unknown> = {};
		if (input.url)
			configUpdates.encrypted_url = await encryptToken(input.url, TOKEN_ENCRYPTION_KEY);
		if (input.secret)
			configUpdates.encrypted_secret = await encryptToken(input.secret, TOKEN_ENCRYPTION_KEY);
		if (input.headers !== undefined) configUpdates.headers = input.headers;

		await repos.integrations.update(id, {
			...(input.name && { name: input.name }),
			...(Object.keys(configUpdates).length > 0 && {
				config: { ...JSON.parse(existing.config), ...configUpdates },
			}),
		});

		await logAudit(c, {
			action: 'update',
			entity_type: 'integration',
			entity_id: id,
			description: `Updated webhook "${existing.name}"`,
		});
		return c.json({ success: true });
	},
);

// DELETE /integrations/:id
integrations.delete('/:id', requireRole('admin', 'editor'), rateLimit('writes'), async (c) => {
	const { id } = c.req.param();
	const repos = c.get('repos');

	const existing = await repos.integrations.findById(id);
	if (!existing) throw new NotFoundError('Integration', id);

	await repos.integrations.delete(id);
	await logAudit(c, {
		action: 'delete',
		entity_type: 'integration',
		entity_id: id,
		description: `Deleted ${existing.type} integration "${existing.name}"`,
	});
	return c.json({ success: true });
});

// POST /integrations/:type/test
integrations.post('/:type/test', requireRole('admin', 'editor'), rateLimit('writes'), async (c) => {
	const { type } = c.req.param();
	const repos = c.get('repos');
	const { TOKEN_ENCRYPTION_KEY } = c.env;

	// For webhooks, allow ?id= param
	const webhookId = c.req.query('id');

	try {
		if (type === 'slack') {
			const integration = await repos.integrations.findByType('slack');
			if (!integration) throw new ValidationError('Slack integration not configured');
			const cfg = JSON.parse(integration.config) as { encrypted_webhook_url: string };
			const url = await decryptToken(cfg.encrypted_webhook_url, TOKEN_ENCRYPTION_KEY);
			await testSlackWebhook(url);
		} else if (type === 'discord') {
			const integration = await repos.integrations.findByType('discord');
			if (!integration) throw new ValidationError('Discord integration not configured');
			const cfg = JSON.parse(integration.config) as { encrypted_webhook_url: string };
			const url = await decryptToken(cfg.encrypted_webhook_url, TOKEN_ENCRYPTION_KEY);
			await testDiscordWebhook(url);
		} else if (type === 'pagerduty') {
			const integration = await repos.integrations.findByType('pagerduty');
			if (!integration) throw new ValidationError('PagerDuty integration not configured');
			const cfg = JSON.parse(integration.config) as { encrypted_routing_key: string };
			const key = await decryptToken(cfg.encrypted_routing_key, TOKEN_ENCRYPTION_KEY);
			await testPagerDutyIntegration(key);
		} else if (type === 'teams') {
			const integration = await repos.integrations.findByType('teams');
			if (!integration) throw new ValidationError('MS Teams integration not configured');
			const cfg = JSON.parse(integration.config) as { encrypted_webhook_url: string };
			const url = await decryptToken(cfg.encrypted_webhook_url, TOKEN_ENCRYPTION_KEY);
			await testTeamsWebhook(url);
		} else if (type === 'webhook') {
			if (!webhookId) throw new ValidationError('Provide ?id= for the webhook to test');
			const integration = await repos.integrations.findById(webhookId);
			if (!integration) throw new NotFoundError('Webhook', webhookId);
			const cfg = JSON.parse(integration.config) as {
				encrypted_url: string;
				encrypted_secret?: string;
				headers?: Record<string, string>;
			};
			const url = await decryptToken(cfg.encrypted_url, TOKEN_ENCRYPTION_KEY);
			const secret = cfg.encrypted_secret
				? await decryptToken(cfg.encrypted_secret, TOKEN_ENCRYPTION_KEY)
				: undefined;
			await testWebhook({ url, secret, headers: cfg.headers });
		} else {
			throw new ValidationError(`Unknown integration type: ${type}`);
		}
	} catch (err) {
		if (err instanceof ValidationError || err instanceof NotFoundError) throw err;
		throw new ValidationError(`Test failed: ${(err as Error).message}`);
	}

	await repos.integrations.markUsed(
		type === 'webhook' && webhookId
			? webhookId
			: ((await repos.integrations.findByType(type))?.id ?? ''),
	);

	return c.json({ success: true });
});

export { integrations as integrationsRoutes };
