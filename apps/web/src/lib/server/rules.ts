import { expectArray, expectNullableString, expectNumber, expectObject, expectString } from '$lib/server/assert.js';
import { fetchJson } from '$lib/server/http.js';
import type {
	MetricName,
	NotifyFrequency,
	ResourceType,
	RuleOperator,
	RuleWindow,
	Severity,
} from '@flarelens/shared';

export interface RulesPageData {
	rules: Array<{
		id: string;
		name: string;
		resource_type: ResourceType;
		resource_id: string | null;
		metric: MetricName;
		operator: RuleOperator;
		threshold: number;
		window: RuleWindow;
		severity: Severity;
		notify_frequency: NotifyFrequency;
		enabled: 0 | 1;
	}>;
	resources: Array<{
		id: string;
		name: string;
		type: ResourceType;
	}>;
}

export async function loadRulesPage(fetchFn: typeof fetch): Promise<RulesPageData> {
	const [rulesPayload, resourcesPayload] = await Promise.all([
		fetchJson(fetchFn, '/rules'),
		fetchJson(fetchFn, '/resources'),
	]);

	const rules = expectObject(rulesPayload, 'rules.list');
	const resources = expectObject(resourcesPayload, 'rules.resources');

	return {
		rules: expectArray(rules.rules, 'rules.list.rules').map((item, index) => {
			const row = expectObject(item, `rules.list.rules[${index}]`);
			return {
				id: expectString(row.id, `rules.list.rules[${index}].id`),
				name: expectString(row.name, `rules.list.rules[${index}].name`),
				resource_type: expectString(
					row.resource_type,
					`rules.list.rules[${index}].resource_type`,
				) as ResourceType,
				resource_id: expectNullableString(
					row.resource_id,
					`rules.list.rules[${index}].resource_id`,
				),
				metric: expectString(row.metric, `rules.list.rules[${index}].metric`) as MetricName,
				operator: expectString(
					row.operator,
					`rules.list.rules[${index}].operator`,
				) as RuleOperator,
				threshold: expectNumber(row.threshold, `rules.list.rules[${index}].threshold`),
				window: expectString(row.window, `rules.list.rules[${index}].window`) as RuleWindow,
				severity: expectString(
					row.severity,
					`rules.list.rules[${index}].severity`,
				) as Severity,
				notify_frequency: expectString(
					row.notify_frequency,
					`rules.list.rules[${index}].notify_frequency`,
				) as NotifyFrequency,
				enabled: expectNumber(row.enabled, `rules.list.rules[${index}].enabled`) as 0 | 1,
			};
		}),
		resources: expectArray(resources.resources, 'rules.resources.resources').map((item, index) => {
			const row = expectObject(item, `rules.resources.resources[${index}]`);
			return {
				id: expectString(row.id, `rules.resources.resources[${index}].id`),
				name: expectString(row.name, `rules.resources.resources[${index}].name`),
				type: expectString(
					row.type,
					`rules.resources.resources[${index}].type`,
				) as ResourceType,
			};
		}),
	};
}
