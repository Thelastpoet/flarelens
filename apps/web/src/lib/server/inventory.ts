import {
	expectArray,
	expectNullableString,
	expectNumber,
	expectObject,
	expectString,
} from '$lib/server/assert.js';
import { fetchJson } from '$lib/server/http.js';

export interface InventoryPageData {
	resources: Array<{
		id: string;
		name: string;
		type: 'zone' | 'worker' | 'r2_bucket' | 'kv_namespace' | 'd1_database';
		monitoring_status: 'active' | 'paused';
		cf_resource_id: string;
	}>;
	rules: Array<{
		id: string;
		resource_id: string | null;
		enabled: 0 | 1;
	}>;
}

function parseResources(value: unknown): InventoryPageData['resources'] {
	const data = expectObject(value, 'inventory.resources');
	return expectArray(data.resources, 'inventory.resources.resources').map((item, index) => {
		const row = expectObject(item, `inventory.resources.resources[${index}]`);
		return {
			id: expectString(row.id, `inventory.resources.resources[${index}].id`),
			name: expectString(row.name, `inventory.resources.resources[${index}].name`),
			type: expectString(
				row.type,
				`inventory.resources.resources[${index}].type`,
			) as InventoryPageData['resources'][number]['type'],
			monitoring_status: expectString(
				row.monitoring_status,
				`inventory.resources.resources[${index}].monitoring_status`,
			) as InventoryPageData['resources'][number]['monitoring_status'],
			cf_resource_id: expectString(
				row.cf_resource_id,
				`inventory.resources.resources[${index}].cf_resource_id`,
			),
		};
	});
}

function parseRules(value: unknown): InventoryPageData['rules'] {
	const data = expectObject(value, 'inventory.rules');
	return expectArray(data.rules, 'inventory.rules.rules').map((item, index) => {
		const row = expectObject(item, `inventory.rules.rules[${index}]`);
		return {
			id: expectString(row.id, `inventory.rules.rules[${index}].id`),
			resource_id: expectNullableString(
				row.resource_id,
				`inventory.rules.rules[${index}].resource_id`,
			),
			enabled: expectNumber(row.enabled, `inventory.rules.rules[${index}].enabled`) as 0 | 1,
		};
	});
}

export async function loadInventoryPage(fetchFn: typeof fetch): Promise<InventoryPageData> {
	const [resources, rules] = await Promise.all([
		fetchJson(fetchFn, '/resources'),
		fetchJson(fetchFn, '/rules'),
	]);

	return {
		resources: parseResources(resources),
		rules: parseRules(rules),
	};
}
