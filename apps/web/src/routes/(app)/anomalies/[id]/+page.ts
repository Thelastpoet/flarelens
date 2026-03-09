import { createApiClient } from '$lib/api.js';
import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ fetch, params }) => {
	const api = createApiClient(fetch, '/api');
	try {
		const data = await api.get<{ anomaly: unknown }>(`/anomalies/${params.id}`);
		return { anomaly: data.anomaly };
	} catch {
		return { anomaly: null };
	}
};
