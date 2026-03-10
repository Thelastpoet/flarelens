import { createApiClient } from '$lib/api.js';
import type { PageLoad } from './$types.js';

interface ResourceRecord {
	id: string;
	monitoring_status: 'active' | 'paused';
	type: 'zone' | 'worker' | 'r2_bucket' | 'kv_namespace' | 'd1_database';
}

export const load: PageLoad = async ({ fetch }) => {
	const api = createApiClient(fetch, '/api');

	try {
		const resources = await api.get<{ resources: ResourceRecord[] }>('/resources');
		const all = resources.resources ?? [];
		return {
			resourceCount: all.length,
			activeResourceCount: all.filter((resource) => resource.monitoring_status === 'active').length,
			zoneCount: all.filter((resource) => resource.type === 'zone').length,
		};
	} catch {
		return {
			resourceCount: 0,
			activeResourceCount: 0,
			zoneCount: 0,
		};
	}
};
