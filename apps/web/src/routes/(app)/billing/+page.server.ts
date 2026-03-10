import { loadBillingPage } from '$lib/server/billing.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ fetch }) => loadBillingPage(fetch);
