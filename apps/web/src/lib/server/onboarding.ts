import {
	expectArray,
	expectObject,
	expectString,
} from '$lib/server/assert.js';
import { fetchJson } from '$lib/server/http.js';

type ResourceType = 'zone' | 'worker' | 'r2_bucket' | 'kv_namespace' | 'd1_database';
type MonitoringStatus = 'active' | 'paused';

export interface OnboardingResource {
	id: string;
	name: string;
	type: ResourceType;
	monitoring_status: MonitoringStatus;
	cf_resource_id: string;
}

export interface OnboardingZonesPageData {
	resources: OnboardingResource[];
}

export interface OnboardingSuccessPageData {
	resourceCount: number;
	activeResourceCount: number;
	zoneCount: number;
}

function parseResources(value: unknown, path: string): OnboardingResource[] {
	const data = expectObject(value, path);
	return expectArray(data.resources, `${path}.resources`).map((item, index) => {
		const row = expectObject(item, `${path}.resources[${index}]`);
		return {
			id: expectString(row.id, `${path}.resources[${index}].id`),
			name: expectString(row.name, `${path}.resources[${index}].name`),
			type: expectString(row.type, `${path}.resources[${index}].type`) as ResourceType,
			monitoring_status: expectString(
				row.monitoring_status,
				`${path}.resources[${index}].monitoring_status`,
			) as MonitoringStatus,
			cf_resource_id: expectString(
				row.cf_resource_id,
				`${path}.resources[${index}].cf_resource_id`,
			),
		};
	});
}

export async function loadOnboardingZonesPage(
	fetchFn: typeof fetch,
): Promise<OnboardingZonesPageData> {
	return {
		resources: parseResources(await fetchJson(fetchFn, '/resources'), 'onboarding.zones'),
	};
}

export async function loadOnboardingSuccessPage(
	fetchFn: typeof fetch,
): Promise<OnboardingSuccessPageData> {
	const resources = parseResources(await fetchJson(fetchFn, '/resources'), 'onboarding.success');
	return {
		resourceCount: resources.length,
		activeResourceCount: resources.filter((resource) => resource.monitoring_status === 'active')
			.length,
		zoneCount: resources.filter((resource) => resource.type === 'zone').length,
	};
}
