import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	// Trigger sync
	const _syncRes = await fetch('/api/resources/sync', {
		method: 'POST',
		credentials: 'include',
	});

	// Load resources regardless of sync result
	const res = await fetch('/api/resources', { credentials: 'include' });
	const data = res.ok ? ((await res.json()) as { resources: unknown[] }) : { resources: [] };

	return { resources: data.resources };
};

export const actions: Actions = {
	confirm: async ({ request, fetch }) => {
		const data = await request.formData();
		const paused = data.getAll('paused').map(String);

		// Pause any resources the user deselected
		for (const id of paused) {
			await fetch(`/api/resources/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ monitoring_status: 'paused' }),
				credentials: 'include',
			});
		}

		redirect(303, '/onboarding/success');
	},
};
