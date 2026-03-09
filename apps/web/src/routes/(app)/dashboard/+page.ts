import { createApiClient } from '$lib/api.js';
import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ fetch }) => {
	const api = createApiClient(fetch, '/api');

	const [overview, traffic, baseline, endpoints, botActivity] = await Promise.allSettled([
		api.get('/analytics/overview'),
		api.get('/analytics/traffic'),
		api.get('/analytics/baseline'),
		api.get('/analytics/top-endpoints'),
		api.get('/analytics/bot-activity'),
	]);

	return {
		overview: overview.status === 'fulfilled' ? overview.value : null,
		traffic: traffic.status === 'fulfilled' ? traffic.value : null,
		baseline: baseline.status === 'fulfilled' ? baseline.value : null,
		endpoints: endpoints.status === 'fulfilled' ? endpoints.value : null,
		botActivity: botActivity.status === 'fulfilled' ? botActivity.value : null,
	};
};
