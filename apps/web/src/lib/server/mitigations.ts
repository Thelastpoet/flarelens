import { expectArray, expectNullableString, expectNumber, expectObject, expectString } from '$lib/server/assert.js';
import { fetchJson } from '$lib/server/http.js';
import type { MitigationActionType, ResourceType } from '@flarelens/shared';

export interface MitigationsPageData {
	mitigations: Array<{
		id: string;
		name: string;
		trigger_type: 'traffic_rate';
		trigger_condition: string;
		action_type: Extract<MitigationActionType, 'rate_limit' | 'under_attack_mode' | 'pause_worker'>;
		action_config: string;
		resource_id: string | null;
		enabled: 0 | 1;
		last_triggered: string | null;
		trigger_count: number;
		estimated_savings: number;
	}>;
	resources: Array<{
		id: string;
		name: string;
		type: ResourceType;
		cf_resource_id: string;
	}>;
}

export async function loadMitigationsPage(fetchFn: typeof fetch): Promise<MitigationsPageData> {
	const [mitigationsPayload, resourcesPayload] = await Promise.all([
		fetchJson(fetchFn, '/mitigations'),
		fetchJson(fetchFn, '/resources'),
	]);

	const mitigations = expectObject(mitigationsPayload, 'mitigations.list');
	const resources = expectObject(resourcesPayload, 'mitigations.resources');

	return {
		mitigations: expectArray(mitigations.mitigations, 'mitigations.list.mitigations').map(
			(item, index) => {
				const row = expectObject(item, `mitigations.list.mitigations[${index}]`);
				return {
					id: expectString(row.id, `mitigations.list.mitigations[${index}].id`),
					name: expectString(row.name, `mitigations.list.mitigations[${index}].name`),
					trigger_type: expectString(
						row.trigger_type,
						`mitigations.list.mitigations[${index}].trigger_type`,
					) as 'traffic_rate',
					trigger_condition: expectString(
						row.trigger_condition,
						`mitigations.list.mitigations[${index}].trigger_condition`,
					),
					action_type: expectString(
						row.action_type,
						`mitigations.list.mitigations[${index}].action_type`,
					) as MitigationsPageData['mitigations'][number]['action_type'],
					action_config: expectString(
						row.action_config,
						`mitigations.list.mitigations[${index}].action_config`,
					),
					resource_id: expectNullableString(
						row.resource_id,
						`mitigations.list.mitigations[${index}].resource_id`,
					),
					enabled: expectNumber(
						row.enabled,
						`mitigations.list.mitigations[${index}].enabled`,
					) as 0 | 1,
					last_triggered: expectNullableString(
						row.last_triggered,
						`mitigations.list.mitigations[${index}].last_triggered`,
					),
					trigger_count: expectNumber(
						row.trigger_count,
						`mitigations.list.mitigations[${index}].trigger_count`,
					),
					estimated_savings: expectNumber(
						row.estimated_savings,
						`mitigations.list.mitigations[${index}].estimated_savings`,
					),
				};
			},
		),
		resources: expectArray(resources.resources, 'mitigations.resources.resources').map(
			(item, index) => {
				const row = expectObject(item, `mitigations.resources.resources[${index}]`);
				return {
					id: expectString(row.id, `mitigations.resources.resources[${index}].id`),
					name: expectString(row.name, `mitigations.resources.resources[${index}].name`),
					type: expectString(
						row.type,
						`mitigations.resources.resources[${index}].type`,
					) as ResourceType,
					cf_resource_id: expectString(
						row.cf_resource_id,
						`mitigations.resources.resources[${index}].cf_resource_id`,
					),
				};
			},
		),
	};
}
