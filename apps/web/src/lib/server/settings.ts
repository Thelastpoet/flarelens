import {
	expectBoolean,
	expectNullableNumber,
	expectNullableString,
	expectObject,
	expectString,
} from '$lib/server/assert.js';
import { fetchJson } from '$lib/server/http.js';

export interface SettingsPageData {
	profile: {
		id: string;
		email: string;
		name: string;
		avatar_url: string | null;
		email_verified: boolean;
	};
	notifications: {
		email_enabled: boolean;
		email_min_severity: 'warning' | 'high' | 'critical';
		digest_enabled: boolean;
		digest_time: string;
		in_app_enabled: boolean;
	};
	account: {
		id: string;
		name: string;
		plan: string;
		settings: {
			timezone?: string;
			default_notify_freq?: 'instant' | 'hourly' | 'daily';
			budget_limit?: number | null;
			auto_mitigation_enabled?: boolean;
		};
	};
}

function parseProfile(value: unknown): SettingsPageData['profile'] {
	const data = expectObject(value, 'settings.profile');
	return {
		id: expectString(data.id, 'settings.profile.id'),
		email: expectString(data.email, 'settings.profile.email'),
		name: expectString(data.name, 'settings.profile.name'),
		avatar_url: expectNullableString(data.avatar_url, 'settings.profile.avatar_url'),
		email_verified: expectBoolean(data.email_verified, 'settings.profile.email_verified'),
	};
}

function parseNotifications(value: unknown): SettingsPageData['notifications'] {
	const data = expectObject(value, 'settings.notifications');
	return {
		email_enabled: expectBoolean(data.email_enabled, 'settings.notifications.email_enabled'),
		email_min_severity: expectString(
			data.email_min_severity,
			'settings.notifications.email_min_severity',
		) as SettingsPageData['notifications']['email_min_severity'],
		digest_enabled: expectBoolean(data.digest_enabled, 'settings.notifications.digest_enabled'),
		digest_time: expectString(data.digest_time, 'settings.notifications.digest_time'),
		in_app_enabled: expectBoolean(data.in_app_enabled, 'settings.notifications.in_app_enabled'),
	};
}

function parseAccount(value: unknown): SettingsPageData['account'] {
	const data = expectObject(value, 'settings.account');
	const settings = expectObject(data.settings, 'settings.account.settings');

	const accountSettings: SettingsPageData['account']['settings'] = {};
	if ('timezone' in settings) {
		accountSettings.timezone = expectString(settings.timezone, 'settings.account.settings.timezone');
	}
	if ('default_notify_freq' in settings) {
		accountSettings.default_notify_freq = expectString(
			settings.default_notify_freq,
			'settings.account.settings.default_notify_freq',
		) as SettingsPageData['account']['settings']['default_notify_freq'];
	}
	if ('budget_limit' in settings) {
		accountSettings.budget_limit = expectNullableNumber(
			settings.budget_limit,
			'settings.account.settings.budget_limit',
		);
	}
	if ('auto_mitigation_enabled' in settings) {
		accountSettings.auto_mitigation_enabled = expectBoolean(
			settings.auto_mitigation_enabled,
			'settings.account.settings.auto_mitigation_enabled',
		);
	}

	return {
		id: expectString(data.id, 'settings.account.id'),
		name: expectString(data.name, 'settings.account.name'),
		plan: expectString(data.plan, 'settings.account.plan'),
		settings: accountSettings,
	};
}

export async function loadSettingsPage(fetchFn: typeof fetch): Promise<SettingsPageData> {
	const [profile, notifications, account] = await Promise.all([
		fetchJson(fetchFn, '/settings/profile'),
		fetchJson(fetchFn, '/settings/notifications'),
		fetchJson(fetchFn, '/settings/account'),
	]);

	return {
		profile: parseProfile(profile),
		notifications: parseNotifications(notifications),
		account: parseAccount(account),
	};
}
