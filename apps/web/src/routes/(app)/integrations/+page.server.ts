import { loadIntegrationsPage } from '$lib/server/integrations.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ fetch }) => loadIntegrationsPage(fetch);
