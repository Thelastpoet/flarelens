import type { Anomaly } from '@flarelens/shared';

export interface WebhookConfig {
	url: string;
	secret?: string;
	headers?: Record<string, string>;
}

async function sign(payload: string, secret: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	);
	const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
	return Array.from(new Uint8Array(sig))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export async function sendWebhookAlert(config: WebhookConfig, anomaly: Anomaly): Promise<void> {
	const payload = JSON.stringify({
		event: 'anomaly.detected',
		timestamp: new Date().toISOString(),
		anomaly: {
			id: anomaly.id,
			metric: anomaly.metric,
			severity: anomaly.severity,
			detection_type: anomaly.detection_type,
			current_value: anomaly.current_value,
			baseline_value: anomaly.baseline_value,
			deviation: anomaly.deviation,
			resource_id: anomaly.resource_id,
			detected_at: anomaly.detected_at,
		},
	});

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		'User-Agent': 'FlareLens-Webhook/1.0',
		...config.headers,
	};

	if (config.secret) {
		headers['X-FlareLens-Signature'] = await sign(payload, config.secret);
	}

	const res = await fetch(config.url, { method: 'POST', headers, body: payload });

	if (!res.ok) {
		throw new Error(`Webhook returned ${res.status}: ${await res.text()}`);
	}
}

export async function testWebhook(config: WebhookConfig): Promise<void> {
	const payload = JSON.stringify({
		event: 'test',
		timestamp: new Date().toISOString(),
		message: 'FlareLens webhook integration verified.',
	});

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		'User-Agent': 'FlareLens-Webhook/1.0',
		...config.headers,
	};

	if (config.secret) {
		headers['X-FlareLens-Signature'] = await sign(payload, config.secret);
	}

	const res = await fetch(config.url, { method: 'POST', headers, body: payload });
	if (!res.ok) {
		throw new Error(`Webhook returned ${res.status}: ${await res.text()}`);
	}
}
