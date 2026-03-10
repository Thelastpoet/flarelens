import { loadAnomalyDetailPage } from '$lib/server/anomalies.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ fetch, params }) =>
	loadAnomalyDetailPage(fetch, params.id);
