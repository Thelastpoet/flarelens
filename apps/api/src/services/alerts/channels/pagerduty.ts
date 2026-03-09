import type { Anomaly } from '@flarelens/shared';

const PD_EVENTS_URL = 'https://events.pagerduty.com/v2/enqueue';

type PdSeverity = 'info' | 'warning' | 'error' | 'critical';

const DEFAULT_SEVERITY_MAP: Record<string, PdSeverity> = {
	warning: 'warning',
	high: 'error',
	critical: 'critical',
};

export async function sendPagerDutyAlert(
	routingKey: string,
	anomaly: Anomaly,
	severityMap?: Record<string, PdSeverity>,
): Promise<void> {
	const map = severityMap ?? DEFAULT_SEVERITY_MAP;
	const pdSeverity: PdSeverity = map[anomaly.severity] ?? 'error';

	const body = {
		routing_key: routingKey,
		event_action: 'trigger',
		dedup_key: `flarelens-${anomaly.id}`,
		payload: {
			summary: `FlareLens: ${anomaly.severity.toUpperCase()} anomaly on ${anomaly.metric} (resource: ${anomaly.resource_id})`,
			severity: pdSeverity,
			source: 'FlareLens',
			timestamp: anomaly.detected_at,
			custom_details: {
				anomaly_id: anomaly.id,
				metric: anomaly.metric,
				current_value: anomaly.current_value,
				baseline_value: anomaly.baseline_value,
				detection_type: anomaly.detection_type,
				resource_id: anomaly.resource_id,
			},
		},
	};

	const res = await fetch(PD_EVENTS_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});

	if (!res.ok) {
		throw new Error(`PagerDuty Events API returned ${res.status}: ${await res.text()}`);
	}
}

export async function testPagerDutyIntegration(routingKey: string): Promise<void> {
	const body = {
		routing_key: routingKey,
		event_action: 'trigger',
		dedup_key: `flarelens-test-${Date.now()}`,
		payload: {
			summary: 'FlareLens: Test alert — integration verified successfully.',
			severity: 'info' as PdSeverity,
			source: 'FlareLens',
		},
	};
	const res = await fetch(PD_EVENTS_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		throw new Error(`PagerDuty Events API returned ${res.status}: ${await res.text()}`);
	}
}
