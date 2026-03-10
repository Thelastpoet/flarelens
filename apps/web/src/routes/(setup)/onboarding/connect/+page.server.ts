import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	connect: async ({ request, fetch }) => {
		const data = await request.formData();
		const label = data.get('label')?.toString().trim() ?? 'My Cloudflare Token';
		const token = data.get('token')?.toString().trim();

		if (!token) return fail(400, { error: 'API token is required' });

		const addRes = await fetch('/api/cf-tokens', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ label, token }),
			credentials: 'include',
		});

		if (!addRes.ok) {
			const body = (await addRes.json().catch(() => ({}))) as { error?: string };
			return fail(addRes.status, { error: body.error ?? 'Failed to save token' });
		}

		const { token: savedToken } = (await addRes.json()) as { token: { id: string } };

		const verifyRes = await fetch(`/api/cf-tokens/${savedToken.id}/verify`, {
			method: 'POST',
			credentials: 'include',
		});

		if (!verifyRes.ok) {
			return fail(422, {
				error: 'Token saved but verification failed. Check the token has the required permissions.',
			});
		}

		redirect(303, '/onboarding/zones');
	},
};
