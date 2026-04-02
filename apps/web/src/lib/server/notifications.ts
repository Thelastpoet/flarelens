import { expectArray, expectNullableString, expectNumber, expectObject, expectString } from '$lib/server/assert.js';
import type { AnomalyDetailPageData } from '$lib/server/anomalies.js';
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
			anomaly: AnomalyDetailPageData['anomaly'];
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

	const rows = expectArray(payload.data, 'notifications.list.data').map((item, index) => {
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

	const anomalyMap = new Map<string, AnomalyDetailPageData['anomaly']>();
	const anomalyLinks = rows
		.filter((row) => row.type === 'anomaly' && row.link?.startsWith('/anomalies/'))
		.map((row) => row.link?.split('/').pop())
		.filter((id): id is string => Boolean(id));

	await Promise.all(
		[...new Set(anomalyLinks)].map(async (id) => {
			try {
				const payload = expectObject(await fetchJson(fetchFn, `/anomalies/${id}`), `notifications.anomaly.${id}`);
				const anomaly = expectObject(payload.anomaly, `notifications.anomaly.${id}.anomaly`);
				anomalyMap.set(id, {
					id: expectString(anomaly.id, `notifications.anomaly.${id}.anomaly.id`),
					metric: expectString(anomaly.metric, `notifications.anomaly.${id}.anomaly.metric`) as never,
					severity: expectString(anomaly.severity, `notifications.anomaly.${id}.anomaly.severity`) as never,
					current_value: expectNumber(anomaly.current_value, `notifications.anomaly.${id}.anomaly.current_value`),
					baseline_value: anomaly.baseline_value == null ? null : expectNumber(anomaly.baseline_value, `notifications.anomaly.${id}.anomaly.baseline_value`),
					deviation: anomaly.deviation == null ? null : expectNumber(anomaly.deviation, `notifications.anomaly.${id}.anomaly.deviation`),
					status: expectString(anomaly.status, `notifications.anomaly.${id}.anomaly.status`) as never,
					detected_at: expectString(anomaly.detected_at, `notifications.anomaly.${id}.anomaly.detected_at`),
					resource_id: expectNullableString(anomaly.resource_id, `notifications.anomaly.${id}.anomaly.resource_id`),
					resource_name: null,
					resource_type: null,
					detection_type: expectString(anomaly.detection_type, `notifications.anomaly.${id}.anomaly.detection_type`) as never,
					attribution: [],
					dismissed_by: null,
				});
			} catch {
				anomalyMap.set(id, null);
			}
		}),
	);

	const resourceIds = [...new Set(
		[...anomalyMap.values()]
			.map((anomaly) => anomaly?.resource_id)
			.filter((id): id is string => Boolean(id)),
	)];
	const resourceMap = new Map<string, { name: string; type: string }>();
	await Promise.all(
		resourceIds.map(async (id) => {
			try {
				const payload = expectObject(await fetchJson(fetchFn, `/resources/${id}`), `notifications.resource.${id}`);
				const resource = expectObject(payload.resource, `notifications.resource.${id}.resource`);
				resourceMap.set(id, {
					name: expectString(resource.name, `notifications.resource.${id}.resource.name`),
					type: expectString(resource.type, `notifications.resource.${id}.resource.type`),
				});
			} catch {
				// Leave missing resource names unresolved rather than failing the page.
			}
		}),
	);

	const data = rows.map((row) => ({
		...row,
		anomaly: (() => {
			if (!(row.type === 'anomaly' && row.link?.startsWith('/anomalies/'))) {
				return null;
			}
			const anomaly = anomalyMap.get(row.link.split('/').pop() ?? '') ?? null;
			if (!anomaly?.resource_id) return anomaly;
			const resource = resourceMap.get(anomaly.resource_id);
			return {
				...anomaly,
				resource_name: resource?.name ?? anomaly.resource_name,
				resource_type: resource?.type ?? anomaly.resource_type,
			};
		})(),
	}));

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
