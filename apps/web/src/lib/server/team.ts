import { expectArray, expectNullableString, expectObject, expectString } from '$lib/server/assert.js';
import { fetchJson } from '$lib/server/http.js';
import type { Role, TeamMemberStatus } from '@flarelens/shared';

export interface TeamPageData {
	members: Array<{
		id: string;
		user_id: string | null;
		email: string;
		role: Role;
		status: TeamMemberStatus;
		invited_by: string | null;
		invited_at: string;
		accepted_at: string | null;
		last_active_at: string | null;
	}>;
}

export async function loadTeamPage(fetchFn: typeof fetch): Promise<TeamPageData> {
	const payload = expectObject(await fetchJson(fetchFn, '/team/members'), 'team.members');
	return {
		members: expectArray(payload.members, 'team.members.members').map((item, index) => {
			const row = expectObject(item, `team.members.members[${index}]`);
			return {
				id: expectString(row.id, `team.members.members[${index}].id`),
				user_id: expectNullableString(row.user_id, `team.members.members[${index}].user_id`),
				email: expectString(row.email, `team.members.members[${index}].email`),
				role: expectString(row.role, `team.members.members[${index}].role`) as Role,
				status: expectString(
					row.status,
					`team.members.members[${index}].status`,
				) as TeamMemberStatus,
				invited_by: expectNullableString(
					row.invited_by,
					`team.members.members[${index}].invited_by`,
				),
				invited_at: expectString(
					row.invited_at,
					`team.members.members[${index}].invited_at`,
				),
				accepted_at: expectNullableString(
					row.accepted_at,
					`team.members.members[${index}].accepted_at`,
				),
				last_active_at: expectNullableString(
					row.last_active_at,
					`team.members.members[${index}].last_active_at`,
				),
			};
		}),
	};
}
