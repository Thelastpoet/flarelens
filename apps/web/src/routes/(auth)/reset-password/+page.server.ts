import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token');
	if (!token) redirect(303, '/forgot-password');
	return { token };
};

export const actions: Actions = {
	reset: async ({ request, fetch }) => {
		const data = await request.formData();
		const token = data.get('token')?.toString();
		const password = data.get('password')?.toString();
		const confirm_password = data.get('confirm_password')?.toString();

		if (!token || !password || !confirm_password) {
			return fail(400, { error: 'All fields are required' });
		}
		if (password !== confirm_password) {
			return fail(400, { error: 'Passwords do not match' });
		}

		const res = await fetch('/api/auth/reset-password', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ token, password, confirm_password }),
		});

		if (!res.ok) {
			const body = (await res.json().catch(() => ({}))) as { error?: string };
			return fail(res.status, { error: body.error ?? 'Reset failed. The link may have expired.' });
		}

		redirect(303, '/login?reset=1');
	},
};
