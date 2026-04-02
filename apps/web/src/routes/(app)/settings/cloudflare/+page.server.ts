import { loadCfTokensPage } from '$lib/server/cf-tokens.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ fetch }) => loadCfTokensPage(fetch);

