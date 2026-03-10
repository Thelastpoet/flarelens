import { createApiClient } from '$lib/api.js';
import type { PageLoad } from './$types.js';

interface ResourceRecord {
	id: string;
	name: string;
	type: 'zone' | 'worker' | 'r2_bucket' | 'kv_namespace' | 'd1_database';
	monitoring_status: 'active' | 'paused';
	cf_resource_id: string;
}

interface RuleRecord {
	id: string;
	resource_id: string | null;
	enabled: 0 | 1;
}

export const load: PageLoad = async ({ fetch }) => {
	const api = createApiClient(fetch, '/api');
	const [resourcesRes, rulesRes] = await Promise.all([
		api.get<{ resources: ResourceRecord[] }>('/resources'),
		api.get<{ rules: RuleRecord[] }>('/rules'),
	]);

	return {
		resources: resourcesRes.resources,
		rules: rulesRes.rules,
	};
};
