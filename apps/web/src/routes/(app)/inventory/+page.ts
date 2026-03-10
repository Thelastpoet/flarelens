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
	const [resourcesRes, rulesRes] = await Promise.all([
		fetch('/api/resources', { credentials: 'include' }),
		fetch('/api/rules', { credentials: 'include' }),
	]);

	const [resourcesData, rulesData] = await Promise.all([
		resourcesRes.json() as Promise<{ resources: ResourceRecord[] }>,
		rulesRes.json() as Promise<{ rules: RuleRecord[] }>,
	]);

	return {
		resources: resourcesData.resources,
		rules: rulesData.rules,
	};
};
