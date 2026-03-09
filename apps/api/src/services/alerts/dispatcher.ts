import type { Repos } from '../../middleware/repos.js';
import type { Env } from '../../env.js';
import type { Anomaly } from '@flarelens/shared';
import { newId } from '@flarelens/shared';
import { isDuplicate, markSent } from './dedup.js';
import { sendInAppNotification } from './channels/in-app.js';
import { sendEmailAlert } from './channels/email.js';

export async function dispatchAlert(anomaly: Anomaly, repos: Repos, env: Env): Promise<void> {
	// 1. Check dedup — if duplicate, skip
	const duplicate = await isDuplicate(env, anomaly.account_id, anomaly.rule_id, anomaly.resource_id);
	if (duplicate) {
		console.log(`[Dispatcher] Skipping duplicate alert for anomaly ${anomaly.id}`);
		return;
	}

	// 2. Get admin team member to find the account admin email
	let adminEmail: string | null = null;
	let adminName: string = 'Account Admin';

	try {
		const members = await repos.teamMembers.list();
		const adminMember = members.find((m) => m.role === 'admin' && m.status === 'active');
		if (adminMember?.user_id) {
			const user = await repos.users.findById(adminMember.user_id);
			if (user) {
				adminEmail = user.email;
				adminName = user.name;
			}
		}
	} catch (err) {
		console.error('[Dispatcher] Failed to fetch admin user:', err);
	}

	// 3. Send in-app notification (always)
	try {
		await sendInAppNotification(repos, anomaly);
	} catch (err) {
		console.error('[Dispatcher] Failed to send in-app notification:', err);
	}

	// 4. Send email to account admin if RESEND_API_KEY is set
	if (env.RESEND_API_KEY && adminEmail) {
		await sendEmailAlert(env, adminEmail, adminName, anomaly);
	}

	// 5. Record delivery in audit log
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
		console.error('[Dispatcher] Failed to record audit log:', err);
	}

	// 6. Mark as sent in dedup cache
	// Determine notify_frequency from the associated rule if available
	let notifyFrequency: 'instant' | 'hourly' | 'daily' = 'instant';
	if (anomaly.rule_id) {
		try {
			const rule = await repos.rules.findById(anomaly.rule_id);
			if (rule) {
				notifyFrequency = rule.notify_frequency as 'instant' | 'hourly' | 'daily';
			}
		} catch {
			// Use default
		}
	}

	await markSent(env, anomaly.account_id, anomaly.rule_id, anomaly.resource_id, notifyFrequency);
}
