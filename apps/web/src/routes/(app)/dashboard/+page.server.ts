import { loadDashboardPage } from '$lib/server/dashboard.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ fetch }) => loadDashboardPage(fetch);

