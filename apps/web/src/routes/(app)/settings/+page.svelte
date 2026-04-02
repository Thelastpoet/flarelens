<script lang="ts">
	import { api, ApiRequestError } from '$lib/api.js';
	import type { PageData } from './$types.js';

	interface ProfileFormState {
		name: string;
		email: string;
		accountName: string;
	}

	interface PasswordFormState {
		current_password: string;
		new_password: string;
	}

	interface NotificationFormState {
		email_enabled: boolean;
		email_min_severity: 'warning' | 'high' | 'critical';
		digest_enabled: boolean;
		digest_time: string;
		in_app_enabled: boolean;
	}

	let { data }: { data: PageData } = $props();

	let profileForm = $state<ProfileFormState>({
		name: '',
		email: '',
		accountName: '',
	});
	let passwordForm = $state<PasswordFormState>({
		current_password: '',
		new_password: '',
	});
	let notificationForm = $state<NotificationFormState>({
		email_enabled: true,
		email_min_severity: 'warning',
		digest_enabled: false,
		digest_time: '08:00',
		in_app_enabled: true,
	});
	let profileBusy = $state(false);
	let passwordBusy = $state(false);
	let notificationsBusy = $state(false);
	let profileMessage = $state<string | null>(null);
	let passwordMessage = $state<string | null>(null);
	let notificationsMessage = $state<string | null>(null);
	let profileError = $state<string | null>(null);
	let passwordError = $state<string | null>(null);
	let notificationsError = $state<string | null>(null);
	let formsInitialized = $state(false);

	$effect(() => {
		if (formsInitialized) return;

		profileForm = {
			name: data.profile.name,
			email: data.profile.email,
			accountName: data.account.name,
		};
		notificationForm = {
			email_enabled: data.notifications.email_enabled,
			email_min_severity: data.notifications.email_min_severity,
			digest_enabled: data.notifications.digest_enabled,
			digest_time: data.notifications.digest_time,
			in_app_enabled: data.notifications.in_app_enabled,
		};
		formsInitialized = true;
	});

	function initialsFor(name: string | null | undefined): string {
		if (!name) return '?';
		const parts = name
			.split(/\s+/)
			.map((part) => part.trim())
			.filter(Boolean)
			.slice(0, 2);
		if (parts.length === 0) return '?';
		return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
	}

	async function saveProfile() {
		profileBusy = true;
		profileError = null;
		profileMessage = null;

		try {
			await Promise.all([
				api.patch('/settings/profile', { name: profileForm.name.trim() }),
				api.patch('/settings/account', { name: profileForm.accountName.trim() }),
			]);
			profileMessage = 'Profile settings saved.';
		} catch (error) {
			profileError =
				error instanceof ApiRequestError ? error.message : 'Unable to save profile settings.';
		} finally {
			profileBusy = false;
		}
	}

	async function savePassword() {
		passwordBusy = true;
		passwordError = null;
		passwordMessage = null;

		try {
			await api.patch('/settings/password', passwordForm);
			passwordForm = { current_password: '', new_password: '' };
			passwordMessage = 'Password updated.';
		} catch (error) {
			passwordError =
				error instanceof ApiRequestError ? error.message : 'Unable to update password.';
		} finally {
			passwordBusy = false;
		}
	}

	async function saveNotifications() {
		notificationsBusy = true;
		notificationsError = null;
		notificationsMessage = null;

		try {
			await api.patch('/settings/notifications', notificationForm);
			notificationsMessage = 'Notification preferences saved.';
		} catch (error) {
			notificationsError =
				error instanceof ApiRequestError
					? error.message
					: 'Unable to update notification preferences.';
		} finally {
			notificationsBusy = false;
		}
	}
</script>

<div class="max-w-2xl">
	<h1 class="text-2xl font-bold text-slate-900 mb-6">Settings</h1>

	<!-- Cloudflare -->
	<div class="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-4">
		<h2 class="text-sm font-semibold text-slate-900 mb-2">Cloudflare</h2>
		<p class="text-xs text-slate-500">
			Manage the Cloudflare API token used for analytics, monitoring, and resource sync.
		</p>
		<div class="flex justify-end mt-4">
			<a
				href="/settings/cloudflare"
				class="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600"
			>
				Manage Connection
			</a>
		</div>
	</div>

	<!-- Profile -->
	<div class="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-4">
		<h2 class="text-sm font-semibold text-slate-900 mb-5">Profile</h2>
		<div class="flex items-center gap-4 mb-5">
			<div class="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-xl font-semibold text-gray-600">
				{initialsFor(profileForm.name)}
			</div>
			<div>
				<button type="button" disabled class="text-sm text-orange-500/70 cursor-not-allowed">
					Change avatar
				</button>
				<p class="mt-1 text-xs text-slate-500">Avatar uploads are not supported by the current backend.</p>
			</div>
		</div>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<label class="block text-sm text-gray-700 mb-1.5" for="settings-full-name">Full name</label>
				<input bind:value={profileForm.name} type="text" id="settings-full-name" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" />
			</div>
			<div>
				<label class="block text-sm text-gray-700 mb-1.5" for="settings-email">Email address</label>
				<input type="email" id="settings-email" value={profileForm.email} readonly class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-slate-50 text-slate-500 focus:outline-none" />
				<p class="mt-1 text-xs text-slate-500">Email changes are managed by authentication flows, not settings.</p>
			</div>
			<div class="md:col-span-2">
				<label class="block text-sm text-gray-700 mb-1.5" for="settings-account-name">Workspace name</label>
				<input bind:value={profileForm.accountName} type="text" id="settings-account-name" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" />
			</div>
		</div>
		{#if profileError}
			<p class="mt-4 text-sm text-red-600">{profileError}</p>
		{:else if profileMessage}
			<p class="mt-4 text-sm text-emerald-600">{profileMessage}</p>
		{/if}
		<div class="flex justify-end mt-4">
			<button type="button" class="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60" onclick={saveProfile} disabled={profileBusy || profileForm.name.trim().length === 0 || profileForm.accountName.trim().length === 0}>Save Changes</button>
		</div>
	</div>

	<!-- Password -->
	<div class="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-4">
		<h2 class="text-sm font-semibold text-slate-900 mb-5">Change Password</h2>
		<div class="space-y-4">
			<div>
				<label class="block text-sm text-gray-700 mb-1.5" for="settings-current-password">Current password</label>
				<input bind:value={passwordForm.current_password} type="password" id="settings-current-password" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" />
			</div>
			<div>
				<label class="block text-sm text-gray-700 mb-1.5" for="settings-new-password">New password</label>
				<input bind:value={passwordForm.new_password} type="password" id="settings-new-password" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" />
			</div>
		</div>
		{#if passwordError}
			<p class="mt-4 text-sm text-red-600">{passwordError}</p>
		{:else if passwordMessage}
			<p class="mt-4 text-sm text-emerald-600">{passwordMessage}</p>
		{/if}
		<div class="flex justify-end mt-4">
			<button type="button" class="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60" onclick={savePassword} disabled={passwordBusy || passwordForm.current_password.length === 0 || passwordForm.new_password.length < 8}>Update Password</button>
		</div>
	</div>

	<!-- Notifications -->
	<div class="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-4">
		<h2 class="text-sm font-semibold text-slate-900 mb-5">Notification Preferences</h2>
		<div class="space-y-3">
			{#each [
				{ key: 'email_enabled', label: 'Email notifications', desc: 'Receive alerts via email' },
				{ key: 'in_app_enabled', label: 'In-app notifications', desc: 'Show alerts inside FlareLens' },
				{ key: 'digest_enabled', label: 'Daily digest', desc: 'Daily summary of anomalies and costs' },
			] as pref}
				<div class="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
					<div>
						<div class="text-sm font-medium text-slate-700">{pref.label}</div>
						<div class="text-xs text-gray-400">{pref.desc}</div>
					</div>
					<button
						type="button"
						role="switch"
						aria-checked={notificationForm[pref.key as keyof NotificationFormState] as boolean}
						aria-label={`Toggle ${pref.label}`}
						onclick={() => {
							const key = pref.key as keyof NotificationFormState;
							notificationForm = {
								...notificationForm,
								[key]: !(notificationForm[key] as boolean),
							};
						}}
						class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {(notificationForm[pref.key as keyof NotificationFormState] as boolean) ? 'bg-orange-500' : 'bg-gray-200'}"
					>
						<span class="inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform {(notificationForm[pref.key as keyof NotificationFormState] as boolean) ? 'translate-x-6' : 'translate-x-1'}"></span>
					</button>
				</div>
			{/each}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
				<div>
					<label class="block text-sm text-gray-700 mb-1.5" for="settings-email-severity">Email minimum severity</label>
					<select bind:value={notificationForm.email_min_severity} id="settings-email-severity" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200">
						<option value="warning">Warning</option>
						<option value="high">High</option>
						<option value="critical">Critical</option>
					</select>
				</div>
				<div>
					<label class="block text-sm text-gray-700 mb-1.5" for="settings-digest-time">Daily digest time</label>
					<input bind:value={notificationForm.digest_time} type="time" id="settings-digest-time" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" />
				</div>
			</div>
		</div>
		{#if notificationsError}
			<p class="mt-4 text-sm text-red-600">{notificationsError}</p>
		{:else if notificationsMessage}
			<p class="mt-4 text-sm text-emerald-600">{notificationsMessage}</p>
		{/if}
		<div class="mt-4 flex justify-end">
			<button type="button" class="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60" onclick={saveNotifications} disabled={notificationsBusy}>Save Preferences</button>
		</div>
	</div>

	<div class="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-4">
		<h2 class="text-sm font-semibold text-slate-900 mb-5">Workspace</h2>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<div class="text-xs uppercase tracking-wide text-slate-500">Plan</div>
				<div class="mt-2 text-sm font-medium text-slate-800 capitalize">{data.account.plan}</div>
			</div>
			<div>
				<div class="text-xs uppercase tracking-wide text-slate-500">Timezone</div>
				<div class="mt-2 text-sm font-medium text-slate-800">{data.account.settings.timezone ?? 'Not configured'}</div>
			</div>
		</div>
	</div>

	<!-- Danger zone -->
	<div class="bg-white rounded-xl border border-red-100 shadow-sm p-6">
		<h2 class="text-sm font-semibold text-red-600 mb-3">Danger Zone</h2>
		<div class="flex items-center justify-between">
			<div>
				<div class="text-sm font-medium text-slate-800">Delete Account</div>
				<div class="text-xs text-gray-400">Permanently delete your account and all data. This action is not exposed by the current backend.</div>
			</div>
			<button type="button" disabled class="px-4 py-2 border border-red-300 text-red-400 text-sm font-medium rounded-lg cursor-not-allowed">Delete Account</button>
		</div>
	</div>
</div>
