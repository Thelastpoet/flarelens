import { loadNotificationsPage } from '$lib/server/notifications.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ fetch }) => loadNotificationsPage(fetch);
