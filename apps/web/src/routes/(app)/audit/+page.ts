import { createApiClient } from '$lib/api.js';
import type { PageLoad } from './$types.js';

interface AuditLogRecord {
	id: string;
	user_id: string | null;
	user_email: string | null;
	action: 'create' | 'update' | 'delete' | 'auth' | 'system';
	entity_type: string;
	entity_id: string | null;
	description: string;
	ip_address: string | null;
	created_at: string;
}

export const load: PageLoad = async ({ fetch, url }) => {
	const api = createApiClient(fetch, '/api');
	const page = Number(url.searchParams.get('page') ?? '1');
	const action = url.searchParams.get('action') ?? undefined;
	const from = url.searchParams.get('from') ?? undefined;
	const to = url.searchParams.get('to') ?? undefined;

	const result = await api.get<{
		data: AuditLogRecord[];
		total: number;
		page: number;
		per_page: number;
		total_pages: number;
	}>('/audit-logs', {
		page,
		per_page: 25,
		action,
		from,
		to,
	});

	return {
		logs: result.data,
		total: result.total,
		page: result.page,
		perPage: result.per_page,
		totalPages: result.total_pages,
		filters: { action: action ?? '', from: from ?? '', to: to ?? '' },
	};
};
