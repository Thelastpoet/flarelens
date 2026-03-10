import { loadMitigationsPage } from '$lib/server/mitigations.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ fetch }) => loadMitigationsPage(fetch);
