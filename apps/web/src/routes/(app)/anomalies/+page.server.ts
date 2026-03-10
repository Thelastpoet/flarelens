import { loadAnomaliesPage } from '$lib/server/anomalies.js';
import type { PageServerLoad } from './$types.js';

const STATUSES = ['active', 'dismissed', 'resolved'] as const;
type RouteStatus = (typeof STATUSES)[number] | 'all';

export const load: PageServerLoad = async ({ fetch, url }) => {
	const statusParam = url.searchParams.get('status');
	const status: RouteStatus =
		statusParam === 'active' || statusParam === 'dismissed' || statusParam === 'resolved'
			? statusParam
			: 'all';
	return loadAnomaliesPage(fetch, status);
};
