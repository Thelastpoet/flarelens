import { createApiClient } from '$lib/api.js';
import type { PageLoad } from './$types.js';

interface RuleRecord {
	id: string;
	name: string;
	resource_type: 'zone' | 'worker' | 'r2_bucket' | 'kv_namespace' | 'd1_database';
	resource_id: string | null;
	metric: 'requests' | 'cached_requests' | 'bytes' | 'threats';
	operator: 'gt' | 'lt' | 'gte' | 'lte';
	threshold: number;
	window: '5m' | '1h' | '1d';
	severity: 'warning' | 'high' | 'critical';
	notify_frequency: 'instant' | 'hourly' | 'daily';
	enabled: 0 | 1;
}

interface ResourceRecord {
	id: string;
	name: string;
	type: 'zone' | 'worker' | 'r2_bucket' | 'kv_namespace' | 'd1_database';
}

export const load: PageLoad = async ({ fetch }) => {
	const api = createApiClient(fetch, '/api');
	const [rulesRes, resourcesRes] = await Promise.all([
		api.get<{ rules: RuleRecord[] }>('/rules'),
		api.get<{ resources: ResourceRecord[] }>('/resources'),
	]);

	return {
		rules: rulesRes.rules,
		resources: resourcesRes.resources,
	};
};
