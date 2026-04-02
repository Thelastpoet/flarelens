import {
	expectArray,
	expectNullableNumber,
	expectNullableString,
	expectNumber,
	expectObject,
	expectString,
} from '$lib/server/assert.js';
import { fetchJson } from '$lib/server/http.js';
import type { AnomalyStatus, DetectionType, MetricName, Severity } from '@flarelens/shared';

type AttributionItem = {
	type: string;
	value: string;
	contribution_pct: number;
	current_value: number;
	baseline_value: number;
};

function expectOptionalNullableString(value: unknown, path: string): string | null {
	return value == null ? null : expectNullableString(value, path);
}

export interface AnomalyDetailPageData {
	anomaly: {
		id: string;
		metric: MetricName;
		severity: Severity;
		current_value: number;
		baseline_value: number | null;
		deviation: number | null;
		status: AnomalyStatus;
		detected_at: string;
		resource_id: string | null;
		resource_name: string | null;
		resource_type: string | null;
		detection_type: DetectionType;
		attribution: AttributionItem[];
		dismissed_by: string | null;
	} | null;
}

function parseAttribution(value: unknown, path: string): AttributionItem[] {
	if (value === null) {
		return [];
	}

	const raw = typeof value === 'string' ? JSON.parse(value) : value;
	return expectArray(raw, path).map((item, index) => {
		const row = expectObject(item, `${path}[${index}]`);
		return {
			type: expectString(row.type, `${path}[${index}].type`),
			value: expectString(row.value, `${path}[${index}].value`),
			contribution_pct: expectNumber(row.contribution_pct, `${path}[${index}].contribution_pct`),
			current_value: expectNumber(row.current_value, `${path}[${index}].current_value`),
			baseline_value: expectNumber(row.baseline_value, `${path}[${index}].baseline_value`),
		};
	});
}

export interface AnomaliesPageData {
	anomalies: Array<{
		id: string;
		metric: MetricName;
		severity: Severity;
		current_value: number;
		baseline_value: number | null;
		deviation: number | null;
		status: AnomalyStatus;
		detected_at: string;
		resource_id: string | null;
		resource_name: string | null;
		resource_type: string | null;
		detection_type: DetectionType;
		attribution: AttributionItem[];
	}>;
	total: number;
	status: 'active' | 'dismissed' | 'resolved' | 'all';
}

function parseAnomalyRow(row: Record<string, unknown>, path: string) {
	return {
		id: expectString(row.id, `${path}.id`),
		metric: expectString(row.metric, `${path}.metric`) as MetricName,
		severity: expectString(row.severity, `${path}.severity`) as Severity,
		current_value: expectNumber(row.current_value, `${path}.current_value`),
		baseline_value: expectNullableNumber(row.baseline_value, `${path}.baseline_value`),
		deviation: expectNullableNumber(row.deviation, `${path}.deviation`),
		status: expectString(row.status, `${path}.status`) as AnomalyStatus,
		detected_at: expectString(row.detected_at, `${path}.detected_at`),
		resource_id: expectNullableString(row.resource_id, `${path}.resource_id`),
		resource_name: expectOptionalNullableString(row.resource_name, `${path}.resource_name`),
		resource_type: expectOptionalNullableString(row.resource_type, `${path}.resource_type`),
		detection_type: expectString(row.detection_type, `${path}.detection_type`) as DetectionType,
		attribution: parseAttribution(row.attribution, `${path}.attribution`),
		dismissed_by: expectOptionalNullableString(row.dismissed_by, `${path}.dismissed_by`),
	};
}

async function loadResourceMap(fetchFn: typeof fetch, resourceIds: string[]): Promise<Map<string, { name: string; type: string }>> {
	const ids = [...new Set(resourceIds.filter(Boolean))];
	const entries = await Promise.all(
		ids.map(async (id) => {
			try {
				const payload = expectObject(await fetchJson(fetchFn, `/resources/${id}`), `resource.${id}`);
				const resource = expectObject(payload.resource, `resource.${id}.resource`);
				return [
					id,
					{
						name: expectString(resource.name, `resource.${id}.resource.name`),
						type: expectString(resource.type, `resource.${id}.resource.type`),
					},
				] as const;
			} catch {
				return null;
			}
		}),
	);
	return new Map(entries.filter((entry): entry is readonly [string, { name: string; type: string }] => entry !== null));
}

export async function loadAnomaliesPage(
	fetchFn: typeof fetch,
	status: 'active' | 'dismissed' | 'resolved' | 'all',
): Promise<AnomaliesPageData> {
	const query = status === 'all' ? '/anomalies' : `/anomalies?status=${status}`;
	const payload = expectObject(await fetchJson(fetchFn, query), 'anomalies.list');

	const resourceMap = await loadResourceMap(
		fetchFn,
		expectArray(payload.data, 'anomalies.list.data')
			.map((item, index) => expectNullableString(expectObject(item, `anomalies.list.data[${index}]`).resource_id, `anomalies.list.data[${index}].resource_id`))
			.filter((id): id is string => id !== null),
	);

	return {
		anomalies: expectArray(payload.data, 'anomalies.list.data').map((item, index) => {
			const row = expectObject(item, `anomalies.list.data[${index}]`);
			const parsed = parseAnomalyRow(row, `anomalies.list.data[${index}]`);
			const resource = parsed.resource_id ? resourceMap.get(parsed.resource_id) : null;
			return {
				...parsed,
				resource_name: resource?.name ?? null,
				resource_type: resource?.type ?? null,
			};
		}),
		total: expectNumber(payload.total, 'anomalies.list.total'),
		status,
	};
}

export async function loadAnomalyDetailPage(
	fetchFn: typeof fetch,
	id: string,
): Promise<AnomalyDetailPageData> {
	try {
		const payload = expectObject(await fetchJson(fetchFn, `/anomalies/${id}`), 'anomalies.detail');
		const anomaly = expectObject(payload.anomaly, 'anomalies.detail.anomaly');
		const parsed = parseAnomalyRow(anomaly, 'anomalies.detail.anomaly');
		const resourceMap = await loadResourceMap(
			fetchFn,
			parsed.resource_id ? [parsed.resource_id] : [],
		);
		const resource = parsed.resource_id ? resourceMap.get(parsed.resource_id) : null;
		return {
			anomaly: {
				...parsed,
				resource_name: resource?.name ?? null,
				resource_type: resource?.type ?? null,
			},
		};
	} catch (error) {
		if (error instanceof Error && error.message.includes('404')) {
			return { anomaly: null };
		}
		throw error;
	}
}
