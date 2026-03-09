import type { Anomaly } from '@flarelens/shared';

const SEVERITY_COLORS: Record<string, string> = {
	critical: '#dc2626',
	high: '#ea580c',
	warning: '#d97706',
};

export async function sendSlackAlert(webhookUrl: string, anomaly: Anomaly): Promise<void> {
	const color = SEVERITY_COLORS[anomaly.severity] ?? '#64748b';
	const title = `${anomaly.severity.toUpperCase()} Anomaly Detected`;
	const detectedAt = new Date(anomaly.detected_at).toLocaleString('en-US', { timeZone: 'UTC' });

	const body = {
		blocks: [
			{
				type: 'header',
				text: { type: 'plain_text', text: `🚨 ${title}`, emoji: true },
			},
			{
				type: 'section',
				fields: [
					{ type: 'mrkdwn', text: `*Metric:*\n${anomaly.metric}` },
					{ type: 'mrkdwn', text: `*Severity:*\n${anomaly.severity}` },
					{ type: 'mrkdwn', text: `*Current Value:*\n${anomaly.current_value}` },
					{
						type: 'mrkdwn',
						text: `*Baseline:*\n${anomaly.baseline_value ?? '—'}`,
					},
					{
						type: 'mrkdwn',
						text: `*Detection:*\n${anomaly.detection_type}`,
					},
					{ type: 'mrkdwn', text: `*Detected At:*\n${detectedAt} UTC` },
				],
			},
			{
				type: 'divider',
			},
			{
				type: 'context',
				elements: [
					{
						type: 'mrkdwn',
						text: `Anomaly ID: \`${anomaly.id}\` | Resource: \`${anomaly.resource_id}\``,
					},
				],
			},
		],
		attachments: [{ color }],
	};

	const res = await fetch(webhookUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});

	if (!res.ok) {
		throw new Error(`Slack webhook returned ${res.status}: ${await res.text()}`);
	}
}

export async function testSlackWebhook(webhookUrl: string): Promise<void> {
	const body = {
		text: '✅ FlareLens Slack integration is working correctly.',
	};
	const res = await fetch(webhookUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		throw new Error(`Slack webhook returned ${res.status}: ${await res.text()}`);
	}
}
