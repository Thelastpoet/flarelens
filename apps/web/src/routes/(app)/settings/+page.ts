import type { PageLoad } from './$types.js';

export interface SettingsProfile {
	id: string;
	email: string;
	name: string;
	avatar_url: string | null;
	email_verified: boolean;
}

export interface SettingsNotificationPrefs {
	email_enabled: boolean;
	email_min_severity: 'warning' | 'high' | 'critical';
	digest_enabled: boolean;
	digest_time: string;
	in_app_enabled: boolean;
}

export interface SettingsAccount {
	id: string;
	name: string;
	plan: string;
	settings: {
		timezone?: string;
		default_notify_freq?: 'instant' | 'hourly' | 'daily';
		budget_limit?: number | null;
		auto_mitigation_enabled?: boolean;
	};
}

export const load: PageLoad = async ({ fetch }) => {
	const [profileRes, notificationsRes, accountRes] = await Promise.all([
		fetch('/api/settings/profile', { credentials: 'include' }),
		fetch('/api/settings/notifications', { credentials: 'include' }),
		fetch('/api/settings/account', { credentials: 'include' }),
	]);

	const [profile, notifications, account] = await Promise.all([
		profileRes.json() as Promise<SettingsProfile>,
		notificationsRes.json() as Promise<SettingsNotificationPrefs>,
		accountRes.json() as Promise<SettingsAccount>,
	]);

	return {
		profile,
		notifications,
		account,
	};
};
