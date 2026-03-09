import { createApiClient } from '$lib/api.js';
import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ fetch }) => {
	const api = createApiClient(fetch, '/api');

	const [traffic, geo, clients, endpoints] = await Promise.allSettled([
		api.get('/analytics/traffic'),
		api.get('/analytics/geo'),
		api.get('/analytics/clients'),
		api.get('/analytics/top-endpoints'),
	]);

	return {
		traffic: traffic.status === 'fulfilled' ? traffic.value : null,
		geo: geo.status === 'fulfilled' ? geo.value : null,
		clients: clients.status === 'fulfilled' ? clients.value : null,
		endpoints: endpoints.status === 'fulfilled' ? endpoints.value : null,
	};
};
