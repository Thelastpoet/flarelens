import { loadAnalyticsPage } from '$lib/server/analytics.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ fetch }) => loadAnalyticsPage(fetch);

