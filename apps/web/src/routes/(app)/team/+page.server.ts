import { loadTeamPage } from '$lib/server/team.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ fetch }) => loadTeamPage(fetch);
