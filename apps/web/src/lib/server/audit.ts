import {
	expectArray,
	expectNullableString,
	expectNumber,
	expectObject,
	expectString,
} from '$lib/server/assert.js';
import { fetchJson } from '$lib/server/http.js';

export interface AuditPageData {
	logs: Array<{
		id: string;
		user_id: string | null;
		user_email: string | null;
		action: 'create' | 'update' | 'delete' | 'auth' | 'system';
		entity_type: string;
		entity_id: string | null;
		description: string;
		ip_address: string | null;
		created_at: string;
	}>;
	total: number;
	page: number;
	perPage: number;
	totalPages: number;
	filters: {
		action: '' | 'create' | 'update' | 'delete' | 'auth' | 'system';
		from: string;
		to: string;
	};
}

export async function loadAuditPage(
	fetchFn: typeof fetch,
	query: { page: number; action: string; from: string; to: string },
): Promise<AuditPageData> {
	const params = new URLSearchParams({
		page: String(query.page),
		per_page: '25',
	});
	if (query.action) params.set('action', query.action);
	if (query.from) params.set('from', query.from);
	if (query.to) params.set('to', query.to);

	const payload = expectObject(await fetchJson(fetchFn, `/audit-logs?${params.toString()}`), 'audit.logs');

	return {
		logs: expectArray(payload.data, 'audit.logs.data').map((item, index) => {
			const row = expectObject(item, `audit.logs.data[${index}]`);
			return {
				id: expectString(row.id, `audit.logs.data[${index}].id`),
				user_id: expectNullableString(row.user_id, `audit.logs.data[${index}].user_id`),
				user_email: expectNullableString(
					row.user_email,
					`audit.logs.data[${index}].user_email`,
				),
				action: expectString(row.action, `audit.logs.data[${index}].action`) as AuditPageData['logs'][number]['action'],
				entity_type: expectString(
					row.entity_type,
					`audit.logs.data[${index}].entity_type`,
				),
				entity_id: expectNullableString(
					row.entity_id,
					`audit.logs.data[${index}].entity_id`,
				),
				description: expectString(
					row.description,
					`audit.logs.data[${index}].description`,
				),
				ip_address: expectNullableString(
					row.ip_address,
					`audit.logs.data[${index}].ip_address`,
				),
				created_at: expectString(
					row.created_at,
					`audit.logs.data[${index}].created_at`,
				),
			};
		}),
		total: expectNumber(payload.total, 'audit.logs.total'),
		page: expectNumber(payload.page, 'audit.logs.page'),
		perPage: expectNumber(payload.per_page, 'audit.logs.per_page'),
		totalPages: expectNumber(payload.total_pages, 'audit.logs.total_pages'),
		filters: {
			action: query.action as AuditPageData['filters']['action'],
			from: query.from,
			to: query.to,
		},
	};
}
