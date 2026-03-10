import { redirect } from '@sveltejs/kit';
import { loadOnboardingZonesPage } from '$lib/server/onboarding.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => loadOnboardingZonesPage(fetch);

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
