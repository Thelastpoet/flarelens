import { createApiClient } from '$lib/api.js';
import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ fetch }) => {
	const api = createApiClient(fetch, '/api');
	try {
		const data = await api.get<{ data: unknown[]; total: number }>('/anomalies');
		return { anomalies: data.data ?? [], total: data.total ?? 0 };
	} catch {
		return { anomalies: [], total: 0 };
	}
};
