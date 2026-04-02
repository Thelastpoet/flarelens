import {
	expectArray,
	expectNullableString,
	expectObject,
	expectString,
} from '$lib/server/assert.js';
import { fetchJson } from '$lib/server/http.js';
import type { CfCapability, CfTokenStatus } from '@flarelens/shared';

export interface CfTokensPageToken {
	id: string;
	label: string;
	status: CfTokenStatus;
	cf_account_id: string | null;
	capabilities: CfCapability[];
	last_used_at: string | null;
	verified_at: string | null;
	verification_error: string | null;
	created_at: string;
}

export interface CfTokensPageData {
	tokens: CfTokensPageToken[];
}

function parseCapabilities(value: string, path: string): CfCapability[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(value);
	} catch {
		throw new Error(`Invalid JSON at ${path}`);
	}
	if (!Array.isArray(parsed)) {
		throw new Error(`Expected array at ${path}`);
	}
	return parsed.map((item, index) => expectString(item, `${path}[${index}]`) as CfCapability);
}

export async function loadCfTokensPage(fetchFn: typeof fetch): Promise<CfTokensPageData> {
	const payload = expectObject(await fetchJson(fetchFn, '/cf-tokens'), 'cfTokens.list');
	return {
		tokens: expectArray(payload.tokens, 'cfTokens.list.tokens').map((item, index) => {
			const row = expectObject(item, `cfTokens.list.tokens[${index}]`);
			const capabilitiesRaw = expectString(
				row.capabilities,
				`cfTokens.list.tokens[${index}].capabilities`,
			);
			return {
				id: expectString(row.id, `cfTokens.list.tokens[${index}].id`),
				label: expectString(row.label, `cfTokens.list.tokens[${index}].label`),
				status: expectString(
					row.status,
					`cfTokens.list.tokens[${index}].status`,
				) as CfTokenStatus,
				cf_account_id: expectNullableString(
					row.cf_account_id,
					`cfTokens.list.tokens[${index}].cf_account_id`,
				),
				capabilities: parseCapabilities(
					capabilitiesRaw || '[]',
					`cfTokens.list.tokens[${index}].capabilities`,
				),
				last_used_at: expectNullableString(
					row.last_used_at,
					`cfTokens.list.tokens[${index}].last_used_at`,
				),
				verified_at: expectNullableString(
					row.verified_at,
					`cfTokens.list.tokens[${index}].verified_at`,
				),
				verification_error: expectNullableString(
					row.verification_error,
					`cfTokens.list.tokens[${index}].verification_error`,
				),
				created_at: expectString(row.created_at, `cfTokens.list.tokens[${index}].created_at`),
			};
		}),
	};
}

