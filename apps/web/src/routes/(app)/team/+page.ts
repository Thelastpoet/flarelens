import { createApiClient } from '$lib/api.js';
import type { PageLoad } from './$types.js';

interface TeamMemberRecord {
	id: string;
	user_id: string | null;
	email: string;
	role: 'admin' | 'editor' | 'viewer';
	status: 'pending' | 'active';
	invited_by: string | null;
	invited_at: string;
	accepted_at: string | null;
	last_active_at: string | null;
}

export const load: PageLoad = async ({ fetch }) => {
	const api = createApiClient(fetch, '/api');
	const members = await api.get<{ members: TeamMemberRecord[] }>('/team/members');

	return {
		members: members.members,
	};
};
