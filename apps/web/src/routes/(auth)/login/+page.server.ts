import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	login: async ({ request, fetch, cookies }) => {
		const data = await request.formData();
		const email = data.get('email')?.toString().trim();
		const password = data.get('password')?.toString();

		if (!email || !password) {
			return fail(400, { error: 'Email and password are required' });
		}

		const res = await fetch('/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password }),
			credentials: 'include',
		});

		if (!res.ok) {
			const body = (await res.json().catch(() => ({}))) as { error?: string };
			return fail(res.status, { error: body.error ?? 'Login failed. Check your credentials.' });
		}

		// Forward Set-Cookie from API response to browser
		const setCookie = res.headers.get('set-cookie');
		if (setCookie)
			cookies.set('__session', extractSessionToken(setCookie), {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				secure: true,
				maxAge: 60 * 60 * 24 * 7,
			});

		redirect(303, '/dashboard');
	},
};

function extractSessionToken(setCookieHeader: string): string {
	const match = setCookieHeader.match(/__session=([^;]+)/);
	return match?.[1] ?? '';
}
