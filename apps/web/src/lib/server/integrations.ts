import { expectArray, expectNullableString, expectObject, expectString } from '$lib/server/assert.js';
import { fetchJson } from '$lib/server/http.js';
import type { IntegrationStatus, IntegrationType } from '@flarelens/shared';

export interface IntegrationsPageData {
	integrations: Array<{
		id: string;
		type: IntegrationType;
		name: string;
		status: IntegrationStatus;
		last_used_at: string | null;
		created_at: string;
		updated_at: string;
	}>;
}

export async function loadIntegrationsPage(fetchFn: typeof fetch): Promise<IntegrationsPageData> {
	const payload = expectObject(await fetchJson(fetchFn, '/integrations'), 'integrations.list');
	return {
		integrations: expectArray(payload.integrations, 'integrations.list.integrations').map(
			(item, index) => {
				const row = expectObject(item, `integrations.list.integrations[${index}]`);
				return {
					id: expectString(row.id, `integrations.list.integrations[${index}].id`),
					type: expectString(
						row.type,
						`integrations.list.integrations[${index}].type`,
					) as IntegrationType,
					name: expectString(row.name, `integrations.list.integrations[${index}].name`),
					status: expectString(
						row.status,
						`integrations.list.integrations[${index}].status`,
					) as IntegrationStatus,
					last_used_at: expectNullableString(
						row.last_used_at,
						`integrations.list.integrations[${index}].last_used_at`,
					),
					created_at: expectString(
						row.created_at,
						`integrations.list.integrations[${index}].created_at`,
					),
					updated_at: expectString(
						row.updated_at,
						`integrations.list.integrations[${index}].updated_at`,
					),
				};
			},
		),
	};
}
