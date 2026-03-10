import type { Anomaly } from '@flarelens/shared';

const SEVERITY_COLORS: Record<string, string> = {
	critical: 'attention',
	high: 'warning',
	warning: 'good',
};

export async function sendTeamsAlert(webhookUrl: string, anomaly: Anomaly): Promise<void> {
	const color = SEVERITY_COLORS[anomaly.severity] ?? 'default';
	const detectedAt = new Date(anomaly.detected_at).toLocaleString('en-US', { timeZone: 'UTC' });

	// Adaptive Card format for MS Teams
	const body = {
		type: 'message',
		attachments: [
			{
				contentType: 'application/vnd.microsoft.card.adaptive',
				content: {
					$schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
					type: 'AdaptiveCard',
					version: '1.4',
					body: [
						{
							type: 'TextBlock',
							size: 'Medium',
							weight: 'Bolder',
							text: `🚨 ${anomaly.severity.toUpperCase()} Anomaly — ${anomaly.metric}`,
							color,
						},
						{
							type: 'FactSet',
							facts: [
								{ title: 'Metric', value: anomaly.metric },
								{ title: 'Severity', value: anomaly.severity },
								{ title: 'Detection Type', value: anomaly.detection_type },
								{ title: 'Current Value', value: String(anomaly.current_value) },
								{
									title: 'Baseline',
									value: anomaly.baseline_value != null ? String(anomaly.baseline_value) : '—',
								},
								{ title: 'Resource', value: anomaly.resource_id },
								{ title: 'Detected At', value: `${detectedAt} UTC` },
							],
						},
					],
				},
			},
		],
	};

	const res = await fetch(webhookUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});

	if (!res.ok) {
		throw new Error(`MS Teams webhook returned ${res.status}: ${await res.text()}`);
	}
}

export async function testTeamsWebhook(webhookUrl: string): Promise<void> {
	const body = {
		type: 'message',
		attachments: [
			{
				contentType: 'application/vnd.microsoft.card.adaptive',
				content: {
					$schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
					type: 'AdaptiveCard',
					version: '1.4',
					body: [
						{
							type: 'TextBlock',
							text: '✅ FlareLens MS Teams integration is working correctly.',
							color: 'good',
						},
					],
				},
			},
		],
	};
	const res = await fetch(webhookUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		throw new Error(`MS Teams webhook returned ${res.status}: ${await res.text()}`);
	}
}
