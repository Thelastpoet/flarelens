import { createApiClient } from '$lib/api.js';
import type { PageLoad } from './$types.js';

interface IntegrationRecord {
	id: string;
	type: 'slack' | 'discord' | 'pagerduty' | 'teams' | 'webhook';
	name: string;
	status: 'active' | 'inactive' | 'error';
	last_used_at: string | null;
	created_at: string;
	updated_at: string;
}

export const load: PageLoad = async ({ fetch }) => {
	const api = createApiClient(fetch, '/api');
	const integrations = await api.get<{ integrations: IntegrationRecord[] }>('/integrations');

	return { integrations: integrations.integrations };
};
