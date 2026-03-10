import { createApiClient } from '$lib/api.js';
import type { PageLoad } from './$types.js';

interface DeveloperTokenRecord {
	id: string;
	name: string;
	token_prefix: string;
	last_used_at: string | null;
	expires_at: string | null;
	created_at: string;
}

interface WebhookRecord {
	id: string;
	type: 'webhook';
	name: string;
	status: 'active' | 'inactive' | 'error';
	last_used_at: string | null;
}

export const load: PageLoad = async ({ fetch }) => {
	const api = createApiClient(fetch, '/api');
	const [tokens, webhooks] = await Promise.all([
		api.get<{ tokens: DeveloperTokenRecord[] }>('/developer/tokens'),
		api.get<{ webhooks: WebhookRecord[] }>('/integrations/webhooks'),
	]);

	return {
		tokens: tokens.tokens,
		webhooks: webhooks.webhooks,
	};
};
