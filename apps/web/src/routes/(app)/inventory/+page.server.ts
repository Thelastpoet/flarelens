import { loadInventoryPage } from '$lib/server/inventory.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ fetch }) => loadInventoryPage(fetch);

