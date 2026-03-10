import { expectArray, expectNullableString, expectNumber, expectObject, expectString } from '$lib/server/assert.js';
import { fetchJson } from '$lib/server/http.js';
import type { NotificationSeverity, NotificationType } from '@flarelens/shared';

export interface NotificationsPageData {
	notifications: {
		data: Array<{
			id: string;
			type: NotificationType;
			title: string;
			body: string;
			severity: NotificationSeverity;
			link: string | null;
			read: 0 | 1;
			created_at: string;
		}>;
		total: number;
		page: number;
		per_page: number;
		total_pages: number;
	};
}

export async function loadNotificationsPage(fetchFn: typeof fetch): Promise<NotificationsPageData> {
	const payload = expectObject(
		await fetchJson(fetchFn, '/notifications?per_page=25'),
		'notifications.list',
	);

	const data = expectArray(payload.data, 'notifications.list.data').map((item, index) => {
		const row = expectObject(item, `notifications.list.data[${index}]`);
		return {
			id: expectString(row.id, `notifications.list.data[${index}].id`),
			type: expectString(
				row.type,
				`notifications.list.data[${index}].type`,
			) as NotificationType,
			title: expectString(row.title, `notifications.list.data[${index}].title`),
			body: expectString(row.body, `notifications.list.data[${index}].body`),
			severity: expectString(
				row.severity,
				`notifications.list.data[${index}].severity`,
			) as NotificationSeverity,
			link: expectNullableString(row.link, `notifications.list.data[${index}].link`),
			read: expectNumber(row.read, `notifications.list.data[${index}].read`) as 0 | 1,
			created_at: expectString(
				row.created_at,
				`notifications.list.data[${index}].created_at`,
			),
		};
	});

	return {
		notifications: {
			data,
			total: expectNumber(payload.total, 'notifications.list.total'),
			page: expectNumber(payload.page, 'notifications.list.page'),
			per_page: expectNumber(payload.per_page, 'notifications.list.per_page'),
			total_pages: expectNumber(payload.total_pages, 'notifications.list.total_pages'),
		},
	};
}
