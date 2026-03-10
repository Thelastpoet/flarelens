import { loadDeveloperPage } from '$lib/server/developer.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ fetch }) => loadDeveloperPage(fetch);
