import { createApiClient } from '$lib/api.js';
import type { PageLoad } from './$types.js';

interface NotificationListResponse {
	data: Array<{
		id: string;
		type: string;
		title: string;
		body: string;
		severity: 'info' | 'warning' | 'critical';
		link: string | null;
		read: 0 | 1;
		created_at: string;
	}>;
	total: number;
	page: number;
	per_page: number;
	total_pages: number;
}

export const load: PageLoad = async ({ fetch }) => {
	const api = createApiClient(fetch, '/api');
	const notifications = await api.get<NotificationListResponse>('/notifications', {
		per_page: 25,
	});

	return { notifications };
};
