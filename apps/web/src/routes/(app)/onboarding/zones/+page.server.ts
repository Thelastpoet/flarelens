import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

interface ResourceRecord {
	id: string;
	name: string;
	type: 'zone' | 'worker' | 'r2_bucket' | 'kv_namespace' | 'd1_database';
	monitoring_status: 'active' | 'paused';
	cf_resource_id: string;
}

export const load: PageServerLoad = async ({ fetch }) => {
	const res = await fetch('/api/resources', { credentials: 'include' });
	const data = res.ok ? ((await res.json()) as { resources: ResourceRecord[] }) : { resources: [] };

	return { resources: data.resources };
};

export const actions: Actions = {
	confirm: async ({ request, fetch }) => {
		const data = await request.formData();
		const allResourceIds = data.getAll('resource_id').map(String);
		const enabledIds = new Set(data.getAll('enabled').map(String));

		for (const id of allResourceIds) {
			await fetch(`/api/resources/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					monitoring_status: enabledIds.has(id) ? 'active' : 'paused',
				}),
				credentials: 'include',
			});
		}

		redirect(303, '/onboarding/success');
	},
};
