import { loadSettingsPage } from '$lib/server/settings.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ fetch }) => loadSettingsPage(fetch);

