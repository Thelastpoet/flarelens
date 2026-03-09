import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ fetch, url }) => {
	const res = await fetch('/api/auth/me', { credentials: 'include' });

	if (!res.ok) {
		const loginUrl = `/login?redirect=${encodeURIComponent(url.pathname)}`;
		redirect(303, loginUrl);
	}

	const user = await res.json();
	return { user };
};
