<script lang="ts">
import { currentUser } from '$lib/data/mock';
</script>

<div class="max-w-2xl">
	<h1 class="text-2xl font-bold text-slate-900 mb-6">Settings</h1>

	<!-- Profile -->
	<div class="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-4">
		<h2 class="text-sm font-semibold text-slate-900 mb-5">Profile</h2>
		<div class="flex items-center gap-4 mb-5">
			<div class="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-xl font-semibold text-gray-600">
				{currentUser.initials}
			</div>
			<button class="text-sm text-orange-500 hover:underline">Change avatar</button>
		</div>
		<div class="grid grid-cols-2 gap-4">
			<div>
				<label class="block text-sm text-gray-700 mb-1.5" for="settings-full-name">Full name</label>
				<input type="text" id="settings-full-name" value={currentUser.name} class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" />
			</div>
			<div>
				<label class="block text-sm text-gray-700 mb-1.5" for="settings-email">Email address</label>
				<input type="email" id="settings-email" value={currentUser.email} class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" />
			</div>
		</div>
		<div class="flex justify-end mt-4">
			<button class="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600">Save Changes</button>
		</div>
	</div>

	<!-- Password -->
	<div class="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-4">
		<h2 class="text-sm font-semibold text-slate-900 mb-5">Change Password</h2>
		<div class="space-y-4">
			<div>
				<label class="block text-sm text-gray-700 mb-1.5" for="settings-current-password">Current password</label>
				<input type="password" id="settings-current-password" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" />
			</div>
			<div>
				<label class="block text-sm text-gray-700 mb-1.5" for="settings-new-password">New password</label>
				<input type="password" id="settings-new-password" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200" />
			</div>
		</div>
		<div class="flex justify-end mt-4">
			<button class="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600">Update Password</button>
		</div>
	</div>

	<!-- Notifications -->
	<div class="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-4">
		<h2 class="text-sm font-semibold text-slate-900 mb-5">Notification Preferences</h2>
		<div class="space-y-3">
			{#each [{ label: 'Email notifications', desc: 'Receive alerts via email', on: true }, { label: 'Slack notifications', desc: 'Send alerts to your Slack channel', on: true }, { label: 'Daily digest', desc: 'Daily summary of anomalies and costs', on: false }] as pref}
				<div class="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
					<div>
						<div class="text-sm font-medium text-slate-700">{pref.label}</div>
						<div class="text-xs text-gray-400">{pref.desc}</div>
					</div>
					<button aria-label="Toggle {pref.label}" class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {pref.on ? 'bg-orange-500' : 'bg-gray-200'}">
						<span class="inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform {pref.on ? 'translate-x-6' : 'translate-x-1'}"></span>
					</button>
				</div>
			{/each}
		</div>
	</div>

	<!-- Danger zone -->
	<div class="bg-white rounded-xl border border-red-100 shadow-sm p-6">
		<h2 class="text-sm font-semibold text-red-600 mb-3">Danger Zone</h2>
		<div class="flex items-center justify-between">
			<div>
				<div class="text-sm font-medium text-slate-800">Delete Account</div>
				<div class="text-xs text-gray-400">Permanently delete your account and all data.</div>
			</div>
			<button class="px-4 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50">Delete Account</button>
		</div>
	</div>
</div>
