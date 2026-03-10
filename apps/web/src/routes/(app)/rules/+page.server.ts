import { loadRulesPage } from '$lib/server/rules.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ fetch }) => loadRulesPage(fetch);
