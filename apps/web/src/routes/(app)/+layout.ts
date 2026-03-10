import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ fetch, url }) => {
	const res = await fetch('/api/auth/me', { credentials: 'include' });

	if (!res.ok) {
		const loginUrl = `/login?redirect=${encodeURIComponent(url.pathname)}`;
		redirect(303, loginUrl);
	}

	const user = await res.json();

	let unreadNotifications = 0;
	try {
		const notificationsRes = await fetch('/api/notifications?read=false&per_page=1', {
			credentials: 'include',
		});
		if (notificationsRes.ok) {
			const notifications = (await notificationsRes.json()) as { total?: number };
			unreadNotifications = notifications.total ?? 0;
		}
	} catch {
		// Keep the shell usable even if notifications fail to load.
	}

	return { user, unreadNotifications };
};
