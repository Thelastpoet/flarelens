import type { Anomaly } from '@flarelens/shared';
import { newId } from '@flarelens/shared';
import type { Repos } from '../../middleware/repos.js';
import type { Env } from '../../env.js';
import { decryptToken } from '../../auth/crypto.js';
import { isDuplicate, markSent } from './dedup.js';
import { sendInAppNotification } from './channels/in-app.js';
import { sendEmailAlert } from './channels/email.js';
import { sendSlackAlert } from './channels/slack.js';
import { sendDiscordAlert } from './channels/discord.js';
import { sendPagerDutyAlert } from './channels/pagerduty.js';
import { sendTeamsAlert } from './channels/teams.js';
import { sendWebhookAlert } from './channels/webhook.js';

export async function dispatchAlert(anomaly: Anomaly, repos: Repos, env: Env): Promise<void> {
	// 1. Dedup check
	const duplicate = await isDuplicate(
		env,
		anomaly.account_id,
		anomaly.rule_id,
		anomaly.resource_id,
		anomaly.metric,
		anomaly.severity,
	);
	if (duplicate) {
		console.log(`[Dispatcher] Skipping duplicate alert for anomaly ${anomaly.id}`);
		return;
	}

	// 2. Get account admin details for email
	let adminEmail: string | null = null;
	let adminName = 'Account Admin';
	try {
		const members = await repos.teamMembers.list();
		const adminMember = members.find((m) => m.role === 'admin' && m.status === 'active');
		if (adminMember?.user_id) {
			const user = await repos.users.findById(adminMember.user_id);
			if (user) { adminEmail = user.email; adminName = user.name; }
		}
	} catch (err) {
		console.error('[Dispatcher] Failed to fetch admin user:', err);
	}

	// 3. In-app notification (always)
	try {
		await sendInAppNotification(repos, anomaly);
	} catch (err) {
		console.error('[Dispatcher] in-app failed:', err);
	}

	// 4. Email
	if (env.RESEND_API_KEY && adminEmail) {
		try {
			await sendEmailAlert(env, adminEmail, adminName, anomaly);
		} catch (err) {
			console.error('[Dispatcher] email failed:', err);
		}
	}

	// 5. External integrations — load once, fan out
	try {
		const allIntegrations = await repos.integrations.list();
		const active = allIntegrations.filter((i) => i.status === 'active');

		await Promise.allSettled(
			active.map(async (integration) => {
				try {
					const cfg = JSON.parse(integration.config) as Record<string, unknown>;

					switch (integration.type) {
						case 'slack': {
							const url = await decryptToken(cfg['encrypted_webhook_url'] as string, env.TOKEN_ENCRYPTION_KEY);
							await sendSlackAlert(url, anomaly);
							break;
						}
						case 'discord': {
							const url = await decryptToken(cfg['encrypted_webhook_url'] as string, env.TOKEN_ENCRYPTION_KEY);
							await sendDiscordAlert(url, anomaly);
							break;
						}
						case 'pagerduty': {
							const key = await decryptToken(cfg['encrypted_routing_key'] as string, env.TOKEN_ENCRYPTION_KEY);
							const severityMap = cfg['severity_map'] as Record<string, 'info' | 'warning' | 'error' | 'critical'> | undefined;
							await sendPagerDutyAlert(key, anomaly, severityMap);
							break;
						}
						case 'teams': {
							const url = await decryptToken(cfg['encrypted_webhook_url'] as string, env.TOKEN_ENCRYPTION_KEY);
							await sendTeamsAlert(url, anomaly);
							break;
						}
						case 'webhook': {
							const url = await decryptToken(cfg['encrypted_url'] as string, env.TOKEN_ENCRYPTION_KEY);
							const secret = cfg['encrypted_secret']
								? await decryptToken(cfg['encrypted_secret'] as string, env.TOKEN_ENCRYPTION_KEY)
								: undefined;
							await sendWebhookAlert({ url, secret, headers: cfg['headers'] as Record<string, string> | undefined }, anomaly);
							break;
						}
					}

					await repos.integrations.markUsed(integration.id);
				} catch (err) {
					console.error(`[Dispatcher] ${integration.type} channel failed:`, err);
				}
			}),
		);
	} catch (err) {
		console.error('[Dispatcher] Failed to load integrations:', err);
	}

	// 6. Audit log
	try {
		await repos.auditLogs.create({
			id: newId(),
			user_id: null,
			user_email: null,
			action: 'system',
			entity_type: 'anomaly',
			entity_id: anomaly.id,
			description: `Alert dispatched for ${anomaly.severity} anomaly on metric ${anomaly.metric}`,
			metadata: {
				anomaly_id: anomaly.id,
				severity: anomaly.severity,
				metric: anomaly.metric,
				email_sent: !!(env.RESEND_API_KEY && adminEmail),
			},
		});
	} catch (err) {
		console.error('[Dispatcher] audit log failed:', err);
	}

	// 7. Mark dedup
	let notifyFrequency: 'instant' | 'hourly' | 'daily' = 'instant';
	if (anomaly.rule_id) {
		try {
			const rule = await repos.rules.findById(anomaly.rule_id);
			if (rule) notifyFrequency = rule.notify_frequency as 'instant' | 'hourly' | 'daily';
		} catch { /* use default */ }
	}
	await markSent(
		env,
		anomaly.account_id,
		anomaly.rule_id,
		anomaly.resource_id,
		anomaly.metric,
		anomaly.severity,
		notifyFrequency,
	);
}
