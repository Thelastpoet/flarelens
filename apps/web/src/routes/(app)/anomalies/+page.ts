import { createApiClient } from '$lib/api.js';
import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ fetch, url }) => {
	const api = createApiClient(fetch, '/api');
	const status = url.searchParams.get('status');
	const queryStatus =
		status === 'active' || status === 'dismissed' || status === 'resolved' ? status : undefined;
	try {
		const data = await api.get<{ data: unknown[]; total: number }>('/anomalies', {
			...(queryStatus ? { status: queryStatus } : {}),
		});
		return {
			anomalies: data.data ?? [],
			total: data.total ?? 0,
			status: queryStatus ?? 'all',
		};
	} catch {
		return { anomalies: [], total: 0, status: queryStatus ?? 'all' };
	}
};
