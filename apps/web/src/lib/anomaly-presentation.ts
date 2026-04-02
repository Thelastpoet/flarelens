import type { DetectionType, MetricName, Severity } from '@flarelens/shared';

export interface PresentedAttributionItem {
	label: string;
	value: string;
	contributionPct: number;
}

export interface PresentedAnomalyInput {
	id: string;
	metric: MetricName;
	severity: Severity;
	current_value: number;
	baseline_value: number | null;
	deviation: number | null;
	detected_at: string;
	resource_id: string | null;
	resource_name?: string | null;
	resource_type?: string | null;
	detection_type: DetectionType;
	attribution: Array<{
		type: string;
		value: string;
		contribution_pct: number;
		current_value: number;
		baseline_value: number;
	}>;
}

const METRIC_LABELS: Record<MetricName, string> = {
	requests: 'traffic',
	bytes: 'bandwidth',
	cached_requests: 'cache activity',
	threats: 'threat traffic',
};

const RESOURCE_TYPE_LABELS: Record<string, string> = {
	zone: 'site',
	worker: 'worker',
	r2_bucket: 'R2 bucket',
	kv_namespace: 'KV namespace',
	d1_database: 'D1 database',
};

const CONTRIBUTOR_LABELS: Record<string, string> = {
	endpoint: 'Top path',
	user_agent: 'Top browser',
	country: 'Top country',
	asn: 'Top network',
	service: 'Top service',
};

function resourceLabel(input: PresentedAnomalyInput): string {
	if (input.resource_name) return input.resource_name;
	if (input.resource_id) return input.resource_id;
	return 'this resource';
}

function resourceKind(input: PresentedAnomalyInput): string {
	if (input.resource_type && RESOURCE_TYPE_LABELS[input.resource_type]) {
		return RESOURCE_TYPE_LABELS[input.resource_type];
	}
	return 'resource';
}

function anomalyDirection(input: PresentedAnomalyInput): 'up' | 'down' | 'changed' {
	if (input.baseline_value != null) {
		if (input.current_value > input.baseline_value) return 'up';
		if (input.current_value < input.baseline_value) return 'down';
	}
	return 'changed';
}

function metricHeadline(metric: MetricName, direction: 'up' | 'down' | 'changed'): string {
	if (metric === 'requests') {
		if (direction === 'up') return 'Traffic surge detected';
		if (direction === 'down') return 'Traffic drop detected';
		return 'Traffic change detected';
	}
	if (metric === 'bytes') {
		if (direction === 'up') return 'Bandwidth surge detected';
		if (direction === 'down') return 'Bandwidth drop detected';
		return 'Bandwidth change detected';
	}
	if (metric === 'cached_requests') {
		if (direction === 'up') return 'Cache activity changed';
		if (direction === 'down') return 'Cache activity dropped';
		return 'Cache activity changed';
	}
	if (direction === 'up') return 'Threat traffic increased';
	if (direction === 'down') return 'Threat traffic dropped';
	return 'Threat traffic changed';
}

function impactLine(input: PresentedAnomalyInput, direction: 'up' | 'down' | 'changed'): string {
	if (input.metric === 'bytes') {
		if (direction === 'up') {
			return 'This can increase Cloudflare and origin bandwidth costs.';
		}
		return 'This can point to lower usage, delivery issues, or changes in caching behavior.';
	}
	if (input.metric === 'requests') {
		if (direction === 'up') {
			return 'This can mean higher load, higher usage costs, or unexpected traffic hitting the app.';
		}
		return 'This can point to an outage, routing issue, or a sudden drop in demand.';
	}
	if (input.metric === 'cached_requests') {
		return 'This can indicate a cache configuration change, lower cache hit rate, or a traffic mix shift.';
	}
	return 'This can indicate abuse traffic, attack activity, or changes in what Cloudflare is blocking.';
}

function nextChecks(input: PresentedAnomalyInput, direction: 'up' | 'down' | 'changed'): string[] {
	if (input.metric === 'bytes') {
		return direction === 'up'
			? ['Check top paths or assets', 'Review cache hit behavior', 'Inspect recent deploys or media changes']
			: ['Check origin health', 'Check whether traffic shifted elsewhere', 'Review cache and delivery changes'];
	}
	if (input.metric === 'requests') {
		return direction === 'up'
			? ['Inspect top paths', 'Check bot or abuse traffic', 'Review recent product launches or campaigns']
			: ['Check origin uptime', 'Review DNS and routing changes', 'Confirm the app is still reachable'];
	}
	if (input.metric === 'cached_requests') {
		return ['Review cache rules', 'Check origin cache headers', 'Compare cached versus uncached traffic'];
	}
	return ['Inspect security events', 'Check top countries and networks', 'Review recent firewall or bot-management changes'];
}

function technicalMetric(metric: MetricName): string {
	if (metric === 'requests') return 'requests';
	if (metric === 'bytes') return 'bytes transferred';
	if (metric === 'cached_requests') return 'cached requests';
	return 'threat requests';
}

export function presentAnomaly(input: PresentedAnomalyInput) {
	const direction = anomalyDirection(input);
	const label = resourceLabel(input);
	const kind = resourceKind(input);
	const metricLabel = METRIC_LABELS[input.metric];
	const topContributor = input.attribution[0];

	const summary =
		direction === 'up'
			? `${metricLabel[0].toUpperCase()}${metricLabel.slice(1)} is higher than expected on ${label}.`
			: direction === 'down'
				? `${metricLabel[0].toUpperCase()}${metricLabel.slice(1)} is lower than expected on ${label}.`
				: `${metricLabel[0].toUpperCase()}${metricLabel.slice(1)} changed unexpectedly on ${label}.`;

	const contributorSummary = topContributor
		? `${CONTRIBUTOR_LABELS[topContributor.type] ?? 'Contributor'}: ${topContributor.value} (${topContributor.contribution_pct}%).`
		: null;

	return {
		headline: `${metricHeadline(input.metric, direction)} on ${label}`,
		shortHeadline: metricHeadline(input.metric, direction),
		resourceLabel: label,
		resourceKind: kind,
		metricLabel,
		summary,
		impact: impactLine(input, direction),
		nextChecks: nextChecks(input, direction),
		contributorSummary,
		technicalSummary: `${technicalMetric(input.metric)} ${direction === 'up' ? 'rose' : direction === 'down' ? 'fell' : 'changed'} to ${input.current_value.toLocaleString()}${input.baseline_value != null ? ` from a baseline of ${input.baseline_value.toLocaleString()}` : ''}.`,
		presentedAttribution: input.attribution.slice(0, 4).map((item) => ({
			label: CONTRIBUTOR_LABELS[item.type] ?? 'Contributor',
			value: item.value,
			contributionPct: item.contribution_pct,
		})) satisfies PresentedAttributionItem[],
	};
}
