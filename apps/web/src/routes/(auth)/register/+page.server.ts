import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	register: async ({ request, fetch, cookies }) => {
		const data = await request.formData();
		const name = data.get('name')?.toString().trim();
		const email = data.get('email')?.toString().trim();
		const password = data.get('password')?.toString();
		const confirm_password = data.get('confirm_password')?.toString();

		if (!name || !email || !password || !confirm_password) {
			return fail(400, { error: 'All fields are required' });
		}
		if (password !== confirm_password) {
			return fail(400, { error: 'Passwords do not match' });
		}
		if (password.length < 8) {
			return fail(400, { error: 'Password must be at least 8 characters' });
		}

		const res = await fetch('/api/auth/register', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name, email, password, confirm_password }),
			credentials: 'include',
		});

		if (!res.ok) {
			const body = (await res.json().catch(() => ({}))) as { error?: string };
			return fail(res.status, { error: body.error ?? 'Registration failed. Please try again.' });
		}

		const setCookie = res.headers.get('set-cookie');
		if (setCookie) {
			const match = setCookie.match(/__session=([^;]+)/);
			if (match?.[1]) {
				cookies.set('__session', match[1], {
					path: '/',
					httpOnly: true,
					sameSite: 'lax',
					secure: true,
					maxAge: 60 * 60 * 24 * 7,
				});
			}
		}

		redirect(303, '/onboarding/connect');
	},
};
