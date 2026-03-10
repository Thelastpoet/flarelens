import {
	expectArray,
	expectNullableString,
	expectNumber,
	expectObject,
	expectString,
} from '$lib/server/assert.js';
import { fetchJson } from '$lib/server/http.js';
import {
	MitigationTriggerConditionSchema,
	PauseWorkerMitigationConfigSchema,
	RateLimitMitigationConfigSchema,
	type MitigationActionType,
	type ResourceType,
	UnderAttackMitigationConfigSchema,
} from '@flarelens/shared';

type TriggerCondition = {
	metric: 'requests' | 'cached_requests' | 'bytes' | 'threats';
	operator: 'gt' | 'lt' | 'gte' | 'lte';
	threshold: number;
};

type RateLimitActionConfig = {
	zone_id: string;
	threshold: number;
	period: number;
	mitigation_timeout?: number;
	url_pattern?: string;
	action_mode: 'ban' | 'challenge' | 'js_challenge' | 'managed_challenge';
	dry_run?: boolean;
};

type UnderAttackActionConfig = {
	zone_id: string;
	security_level: 'under_attack' | 'high' | 'medium';
	dry_run?: boolean;
};

type PauseWorkerActionConfig = {
	worker_name: string;
	dry_run?: boolean;
};

type ParsedMitigation = {
	id: string;
	name: string;
	trigger_type: 'traffic_rate';
	trigger: TriggerCondition;
	action_type: Extract<MitigationActionType, 'rate_limit' | 'under_attack_mode' | 'pause_worker'>;
	resource_id: string | null;
	enabled: 0 | 1;
	last_triggered: string | null;
	trigger_count: number;
	estimated_savings: number;
} & (
	| {
			action_type: 'rate_limit';
			action: RateLimitActionConfig;
	  }
	| {
			action_type: 'under_attack_mode';
			action: UnderAttackActionConfig;
	  }
	| {
			action_type: 'pause_worker';
			action: PauseWorkerActionConfig;
	  }
);

export interface MitigationsPageData {
	mitigations: ParsedMitigation[];
	resources: Array<{
		id: string;
		name: string;
		type: ResourceType;
		cf_resource_id: string;
	}>;
}

function parseJsonObject(value: string, path: string): Record<string, unknown> {
	let parsed: unknown;
	try {
		parsed = JSON.parse(value);
	} catch (error) {
		throw new Error(
			`Invalid data at ${path}: expected valid JSON object (${error instanceof Error ? error.message : 'parse failure'})`,
		);
	}

	return expectObject(parsed, path);
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
				const actionType = expectString(
					row.action_type,
					`mitigations.list.mitigations[${index}].action_type`,
				) as ParsedMitigation['action_type'];
				const trigger = MitigationTriggerConditionSchema.parse(
					parseJsonObject(
						expectString(
							row.trigger_condition,
							`mitigations.list.mitigations[${index}].trigger_condition`,
						),
						`mitigations.list.mitigations[${index}].trigger_condition`,
					),
				) as TriggerCondition;

				const base = {
					id: expectString(row.id, `mitigations.list.mitigations[${index}].id`),
					name: expectString(row.name, `mitigations.list.mitigations[${index}].name`),
					trigger_type: expectString(
						row.trigger_type,
						`mitigations.list.mitigations[${index}].trigger_type`,
					) as 'traffic_rate',
					trigger,
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
				} as const;

				const actionConfig = parseJsonObject(
					expectString(
						row.action_config,
						`mitigations.list.mitigations[${index}].action_config`,
					),
					`mitigations.list.mitigations[${index}].action_config`,
				);

				if (actionType === 'rate_limit') {
					const parsed = RateLimitMitigationConfigSchema.parse(actionConfig);
					if (parsed.action_mode === undefined) {
						throw new Error(
							`Invalid data at mitigations.list.mitigations[${index}].action_config.action_mode: expected configured rate-limit action mode`,
						);
					}

					return {
						...base,
						action_type: actionType,
						action: parsed as RateLimitActionConfig,
					};
				}

				if (actionType === 'under_attack_mode') {
					const parsed = UnderAttackMitigationConfigSchema.parse(actionConfig);
					if (parsed.security_level === undefined) {
						throw new Error(
							`Invalid data at mitigations.list.mitigations[${index}].action_config.security_level: expected configured under-attack security level`,
						);
					}

					return {
						...base,
						action_type: actionType,
						action: parsed as UnderAttackActionConfig,
					};
				}

				return {
					...base,
					action_type: actionType,
					action: PauseWorkerMitigationConfigSchema.parse(actionConfig) as PauseWorkerActionConfig,
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
