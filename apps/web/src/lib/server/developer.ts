import { expectArray, expectNullableString, expectObject, expectString } from '$lib/server/assert.js';
import { fetchJson } from '$lib/server/http.js';
import type { IntegrationStatus } from '@flarelens/shared';

export interface DeveloperPageData {
	tokens: Array<{
		id: string;
		name: string;
		token_prefix: string;
		last_used_at: string | null;
		expires_at: string | null;
		created_at: string;
	}>;
	webhooks: Array<{
		id: string;
		type: 'webhook';
		name: string;
		status: IntegrationStatus;
		last_used_at: string | null;
	}>;
}

export async function loadDeveloperPage(fetchFn: typeof fetch): Promise<DeveloperPageData> {
	const [tokensPayload, webhooksPayload] = await Promise.all([
		fetchJson(fetchFn, '/developer/tokens'),
		fetchJson(fetchFn, '/integrations/webhooks'),
	]);

	const tokens = expectObject(tokensPayload, 'developer.tokens');
	const webhooks = expectObject(webhooksPayload, 'developer.webhooks');

	return {
		tokens: expectArray(tokens.tokens, 'developer.tokens.tokens').map((item, index) => {
			const row = expectObject(item, `developer.tokens.tokens[${index}]`);
			return {
				id: expectString(row.id, `developer.tokens.tokens[${index}].id`),
				name: expectString(row.name, `developer.tokens.tokens[${index}].name`),
				token_prefix: expectString(
					row.token_prefix,
					`developer.tokens.tokens[${index}].token_prefix`,
				),
				last_used_at: expectNullableString(
					row.last_used_at,
					`developer.tokens.tokens[${index}].last_used_at`,
				),
				expires_at: expectNullableString(
					row.expires_at,
					`developer.tokens.tokens[${index}].expires_at`,
				),
				created_at: expectString(
					row.created_at,
					`developer.tokens.tokens[${index}].created_at`,
				),
			};
		}),
		webhooks: expectArray(webhooks.webhooks, 'developer.webhooks.webhooks').map(
			(item, index) => {
				const row = expectObject(item, `developer.webhooks.webhooks[${index}]`);
				return {
					id: expectString(row.id, `developer.webhooks.webhooks[${index}].id`),
					type: expectString(
						row.type,
						`developer.webhooks.webhooks[${index}].type`,
					) as 'webhook',
					name: expectString(row.name, `developer.webhooks.webhooks[${index}].name`),
					status: expectString(
						row.status,
						`developer.webhooks.webhooks[${index}].status`,
					) as IntegrationStatus,
					last_used_at: expectNullableString(
						row.last_used_at,
						`developer.webhooks.webhooks[${index}].last_used_at`,
					),
				};
			},
		),
	};
}
