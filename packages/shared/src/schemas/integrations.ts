import { z } from 'zod';

export const SlackIntegrationSchema = z.object({
	name: z.string().min(1).max(100).default('Slack'),
	webhook_url: z
		.string()
		.url()
		.refine((v) => v.startsWith('https://hooks.slack.com/'), {
			message: 'Must be a valid Slack webhook URL',
		}),
});

export const DiscordIntegrationSchema = z.object({
	name: z.string().min(1).max(100).default('Discord'),
	webhook_url: z.string().url(),
});

export const PagerDutyIntegrationSchema = z.object({
	name: z.string().min(1).max(100).default('PagerDuty'),
	routing_key: z.string().min(1),
	severity_map: z
		.object({
			warning: z.enum(['info', 'warning', 'error', 'critical']).default('warning'),
			high: z.enum(['info', 'warning', 'error', 'critical']).default('error'),
			critical: z.enum(['info', 'warning', 'error', 'critical']).default('critical'),
		})
		.default({ warning: 'warning', high: 'error', critical: 'critical' }),
});

export const TeamsIntegrationSchema = z.object({
	name: z.string().min(1).max(100).default('Microsoft Teams'),
	webhook_url: z.string().url(),
});

export const WebhookIntegrationSchema = z.object({
	name: z.string().min(1).max(100),
	url: z.string().url(),
	secret: z.string().max(256).optional(),
	headers: z.record(z.string(), z.string()).optional(),
});

export type SlackIntegrationInput = z.infer<typeof SlackIntegrationSchema>;
export type DiscordIntegrationInput = z.infer<typeof DiscordIntegrationSchema>;
export type PagerDutyIntegrationInput = z.infer<typeof PagerDutyIntegrationSchema>;
export type TeamsIntegrationInput = z.infer<typeof TeamsIntegrationSchema>;
export type WebhookIntegrationInput = z.infer<typeof WebhookIntegrationSchema>;
