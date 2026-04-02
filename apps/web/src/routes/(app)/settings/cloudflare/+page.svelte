<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { api, ApiRequestError } from '$lib/api.js';
	import type { CfTokensPageToken } from '$lib/server/cf-tokens.js';
	import type { PageData } from './$types.js';

	interface AddTokenFormState {
		label: string;
		token: string;
	}

	let { data }: { data: PageData } = $props();

	const tokens = $derived(data.tokens);

	let addForm = $state<AddTokenFormState>({
		label: '',
		token: '',
	});
	let busyAction = $state<string | null>(null);
	let error = $state<string | null>(null);
	let message = $state<string | null>(null);

	function formatDate(iso: string | null): string {
		if (!iso) return 'Never';
		return new Date(iso).toLocaleString();
	}

	function statusBadge(status: CfTokensPageToken['status']): string {
		if (status === 'active') return 'bg-green-100 text-green-800';
		if (status === 'pending') return 'bg-amber-100 text-amber-800';
		if (status === 'invalid') return 'bg-red-100 text-red-800';
		return 'bg-slate-100 text-slate-700';
	}

	async function addAndVerify() {
		error = null;
		message = null;
		busyAction = 'add';
		try {
			const res = await api.post<{ token: { id: string } }>('/cf-tokens', {
				label: addForm.label.trim().length ? addForm.label.trim() : 'My Cloudflare Token',
				token: addForm.token.trim(),
			});
			await api.post(`/cf-tokens/${res.token.id}/verify`);
			addForm = { label: '', token: '' };
			message = 'Cloudflare token verified and connected.';
			await invalidateAll();
		} catch (e) {
			error = e instanceof ApiRequestError ? e.message : 'Unable to add or verify token.';
			await invalidateAll();
		} finally {
			busyAction = null;
		}
	}

	async function verifyToken(id: string) {
		error = null;
		message = null;
		busyAction = `verify:${id}`;
		try {
			await api.post(`/cf-tokens/${id}/verify`);
			message = 'Token verified.';
			await invalidateAll();
		} catch (e) {
			error = e instanceof ApiRequestError ? e.message : 'Unable to verify token.';
			await invalidateAll();
		} finally {
			busyAction = null;
		}
	}

	async function revokeToken(id: string) {
		error = null;
		message = null;
		busyAction = `revoke:${id}`;
		try {
			await api.delete(`/cf-tokens/${id}`);
			message = 'Token revoked.';
			await invalidateAll();
		} catch (e) {
			error = e instanceof ApiRequestError ? e.message : 'Unable to revoke token.';
			await invalidateAll();
		} finally {
			busyAction = null;
		}
	}
</script>

<div class="max-w-4xl mx-auto flex flex-col gap-8">
	<div class="flex flex-col gap-2">
		<h1 class="text-slate-900 text-3xl font-black leading-tight tracking-[-0.033em]">
			Cloudflare Connection
		</h1>
		<p class="text-slate-600 text-sm">
			Add, verify, or revoke the Cloudflare API token used for analytics and monitoring.
		</p>
	</div>

	<section class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
		<div class="flex items-center justify-between gap-4 mb-5">
			<h2 class="text-sm font-semibold text-slate-900">Add Token</h2>
			<button
				type="button"
				class="text-xs font-semibold text-primary hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
				onclick={() => invalidateAll()}
				disabled={busyAction !== null}
			>
				Refresh
			</button>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div>
				<label class="block text-sm text-slate-700 mb-1.5" for="cf-token-label">
					Label (optional)
				</label>
				<input
					id="cf-token-label"
					class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
					type="text"
					autocomplete="off"
					bind:value={addForm.label}
					placeholder="e.g. Production Account"
				/>
			</div>
			<div>
				<label class="block text-sm text-slate-700 mb-1.5" for="cf-token-value">
					Cloudflare API Token
				</label>
				<input
					id="cf-token-value"
					class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 font-mono"
					type="password"
					autocomplete="off"
					bind:value={addForm.token}
					placeholder="Paste token"
				/>
			</div>
		</div>

		{#if error}
			<p class="mt-4 text-sm text-red-600">{error}</p>
		{:else if message}
			<p class="mt-4 text-sm text-emerald-600">{message}</p>
		{/if}

		<div class="flex justify-end mt-4">
			<button
				type="button"
				class="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
				onclick={addAndVerify}
				disabled={busyAction !== null || addForm.token.trim().length < 10}
			>
				{busyAction === 'add' ? 'Connecting…' : 'Verify & Connect'}
			</button>
		</div>
	</section>

	<section class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
		<div class="flex items-center justify-between gap-4 p-4 border-b border-slate-200 bg-slate-50">
			<h2 class="text-sm font-semibold text-slate-900">Tokens</h2>
			<span class="text-xs text-slate-500">{tokens.length} total</span>
		</div>

		{#if tokens.length === 0}
			<div class="p-4 text-sm text-slate-500">No Cloudflare tokens have been added yet.</div>
		{:else}
			<div class="divide-y divide-slate-100">
				{#each tokens as token}
					<div class="p-4 flex flex-col gap-3">
						<div class="flex items-start justify-between gap-4">
							<div class="min-w-0">
								<div class="flex items-center gap-2">
									<h3 class="font-semibold text-slate-900 truncate">{token.label}</h3>
									<span class="px-2 py-0.5 text-[11px] font-bold rounded-full {statusBadge(token.status)}">
										{token.status}
									</span>
								</div>
								<div class="mt-1 text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
									<span>Created: {formatDate(token.created_at)}</span>
									<span>Verified: {formatDate(token.verified_at)}</span>
									<span>Last used: {formatDate(token.last_used_at)}</span>
									<span>CF Account: {token.cf_account_id ?? '—'}</span>
								</div>
							</div>
							<div class="flex items-center gap-2 shrink-0">
								<button
									type="button"
									class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
									onclick={() => verifyToken(token.id)}
									disabled={busyAction !== null}
								>
									{busyAction === `verify:${token.id}` ? 'Verifying…' : 'Verify'}
								</button>
								<button
									type="button"
									class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
									onclick={() => revokeToken(token.id)}
									disabled={busyAction !== null}
								>
									{busyAction === `revoke:${token.id}` ? 'Revoking…' : 'Revoke'}
								</button>
							</div>
						</div>

						{#if token.verification_error}
							<div class="text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">
								{token.verification_error}
							</div>
						{/if}

						{#if token.capabilities.length > 0}
							<div class="flex flex-wrap gap-1.5">
								{#each token.capabilities as cap}
									<span class="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-700">
										{cap}
									</span>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</section>
</div>

