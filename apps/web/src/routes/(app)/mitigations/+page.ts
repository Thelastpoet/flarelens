import { createApiClient } from '$lib/api.js';
import type { PageLoad } from './$types.js';

interface MitigationRecord {
	id: string;
	name: string;
	trigger_type: 'traffic_rate';
	trigger_condition: string;
	action_type: 'rate_limit' | 'under_attack_mode' | 'pause_worker';
	action_config: string;
	resource_id: string | null;
	enabled: 0 | 1;
	last_triggered: string | null;
	trigger_count: number;
	estimated_savings: number;
}

interface ResourceRecord {
	id: string;
	name: string;
	type: 'zone' | 'worker' | 'r2_bucket' | 'kv_namespace' | 'd1_database';
	cf_resource_id: string;
}

export const load: PageLoad = async ({ fetch }) => {
	const api = createApiClient(fetch, '/api');
	const [mitigationsRes, resourcesRes] = await Promise.all([
		api.get<{ mitigations: MitigationRecord[] }>('/mitigations'),
		api.get<{ resources: ResourceRecord[] }>('/resources'),
	]);

	return {
		mitigations: mitigationsRes.mitigations,
		resources: resourcesRes.resources,
	};
};
