import { createApiClient } from '$lib/api.js';
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
	const api = createApiClient(fetch, '/api');

	const [profile, notifications, account] = await Promise.all([
		api.get<SettingsProfile>('/settings/profile'),
		api.get<SettingsNotificationPrefs>('/settings/notifications'),
		api.get<SettingsAccount>('/settings/account'),
	]);

	return {
		profile,
		notifications,
		account,
	};
};
