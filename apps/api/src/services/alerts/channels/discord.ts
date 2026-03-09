import type { Anomaly } from '@flarelens/shared';

const SEVERITY_COLORS: Record<string, number> = {
	critical: 0xdc2626,
	high: 0xea580c,
	warning: 0xd97706,
};

export async function sendDiscordAlert(webhookUrl: string, anomaly: Anomaly): Promise<void> {
	const color = SEVERITY_COLORS[anomaly.severity] ?? 0x64748b;
	const detectedAt = new Date(anomaly.detected_at).toISOString();

	const body = {
		embeds: [
			{
				title: `🚨 ${anomaly.severity.toUpperCase()} Anomaly Detected`,
				color,
				fields: [
					{ name: 'Metric', value: anomaly.metric, inline: true },
					{ name: 'Severity', value: anomaly.severity, inline: true },
					{ name: 'Detection Type', value: anomaly.detection_type, inline: true },
					{
						name: 'Current Value',
						value: String(anomaly.current_value),
						inline: true,
					},
					{
						name: 'Baseline',
						value: anomaly.baseline_value != null ? String(anomaly.baseline_value) : '—',
						inline: true,
					},
					{ name: 'Resource', value: `\`${anomaly.resource_id}\``, inline: false },
				],
				footer: { text: `Anomaly ID: ${anomaly.id}` },
				timestamp: detectedAt,
			},
		],
	};

	const res = await fetch(webhookUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});

	if (!res.ok) {
		throw new Error(`Discord webhook returned ${res.status}: ${await res.text()}`);
	}
}

export async function testDiscordWebhook(webhookUrl: string): Promise<void> {
	const body = {
		embeds: [
			{
				title: '✅ FlareLens Discord Integration',
				description: 'Your Discord integration is working correctly.',
				color: 0x22c55e,
			},
		],
	};
	const res = await fetch(webhookUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		throw new Error(`Discord webhook returned ${res.status}: ${await res.text()}`);
	}
}
