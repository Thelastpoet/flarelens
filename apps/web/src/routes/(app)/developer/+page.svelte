<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { api, ApiRequestError } from '$lib/api.js';
	import type { PageData } from './$types.js';

	interface TokenModalState {
		name: string;
		expires_in_days: string;
	}

	interface WebhookModalState {
		name: string;
		url: string;
		secret: string;
	}

	let { data }: { data: PageData } = $props();

	let showTokenModal = $state(false);
	let showWebhookModal = $state(false);
	let busyAction = $state<string | null>(null);
	let formError = $state<string | null>(null);
	let latestToken = $state<string | null>(null);
	let tokenForm = $state<TokenModalState>({
		name: '',
		expires_in_days: '',
	});
	let webhookForm = $state<WebhookModalState>({
		name: '',
		url: '',
		secret: '',
	});

	const tokens = $derived(data.tokens);
	const webhooks = $derived(data.webhooks);
	const snippetTabs = ['Current Status'] as const;
	let activeSnippetTab = $state('Current Status');
	let copied = $state(false);

	function formatDate(iso: string | null): string {
		if (!iso) return 'Never';
		return new Date(iso).toLocaleString();
	}

	async function createToken() {
		formError = null;
		busyAction = 'create-token';
		try {
			const response = await api.post<{
				id: string;
				name: string;
				token: string;
				token_prefix: string;
				expires_at: string | null;
			}>('/developer/tokens', {
				name: tokenForm.name.trim(),
				expires_in_days:
					tokenForm.expires_in_days.trim().length > 0 ? Number(tokenForm.expires_in_days) : undefined,
			});
			latestToken = response.token;
			tokenForm = { name: '', expires_in_days: '' };
			await invalidateAll();
		} catch (error) {
			formError = error instanceof ApiRequestError ? error.message : 'Unable to create token.';
		} finally {
			busyAction = null;
		}
	}

	async function revokeToken(id: string) {
		busyAction = `revoke-${id}`;
		try {
			await api.delete(`/developer/tokens/${id}`);
			await invalidateAll();
		} finally {
			busyAction = null;
		}
	}

	async function createWebhook() {
		formError = null;
		busyAction = 'create-webhook';
		try {
			await api.post('/integrations/webhooks', {
				name: webhookForm.name.trim(),
				url: webhookForm.url,
				secret: webhookForm.secret || undefined,
			});
			webhookForm = { name: '', url: '', secret: '' };
			showWebhookModal = false;
			await invalidateAll();
		} catch (error) {
			formError = error instanceof ApiRequestError ? error.message : 'Unable to create webhook.';
		} finally {
			busyAction = null;
		}
	}

	async function removeWebhook(id: string) {
		busyAction = `webhook-${id}`;
		try {
			await api.delete(`/integrations/${id}`);
			await invalidateAll();
		} finally {
			busyAction = null;
		}
	}

	function copySnippet() {
		navigator.clipboard.writeText(
			`Developer tokens are managed and revocable today, but bearer-token API access is not wired in the current backend. Use the backend-backed app routes instead of a public token-auth workflow.`,
		);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="max-w-4xl mx-auto flex flex-col gap-10">
  <!-- Header -->
  <div class="flex flex-wrap justify-between items-end gap-4 border-b border-primary/20 pb-6">
    <div class="flex min-w-72 flex-col gap-2">
      <h1 class="text-slate-900 dark:text-slate-100 text-3xl font-black leading-tight tracking-[-0.033em]">Developer &amp; API Settings</h1>
      <p class="text-slate-600 dark:text-slate-400 text-base font-normal leading-normal">Manage personal access tokens, webhooks, and integrate FlareLens with your infrastructure.</p>
    </div>
  </div>

  <!-- Personal Access Tokens -->
  <section class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-slate-900 dark:text-slate-100 text-xl font-bold leading-tight">Personal Access Tokens</h2>
        <p class="text-slate-600 dark:text-slate-400 text-sm mt-1">Managed token inventory for administrative use. These tokens are generated and revocable here, but bearer-token API auth is not exposed in the current backend.</p>
      </div>
      <button type="button" onclick={() => { formError = null; latestToken = null; showTokenModal = true; }} class="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary/90 transition-colors text-sm font-semibold shadow-sm">
        <span class="material-symbols-outlined text-sm">add</span>
        Create Token
      </button>
    </div>

    <div class="bg-white dark:bg-slate-800 rounded-xl border border-primary/20 shadow-sm overflow-hidden">
      <div class="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 p-4 border-b border-primary/10 bg-primary/5 text-sm font-semibold text-slate-700 dark:text-slate-300">
        <div>Token Name</div>
        <div>Created</div>
        <div>Last Used</div>
        <div>Actions</div>
      </div>
      {#if tokens.length === 0}
        <div class="p-4 text-sm text-slate-500">No developer tokens created yet.</div>
      {:else}
      {#each tokens as token, i}
        <div class="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 p-4 {i < tokens.length - 1 ? 'border-b border-primary/10' : ''} items-center text-sm hover:bg-primary/5 transition-colors">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-lg">vpn_key</span>
            <div class="flex flex-col">
              <span class="font-medium">{token.name}</span>
              <span class="text-xs text-slate-500 font-mono">{token.token_prefix}...</span>
            </div>
          </div>
          <div class="text-slate-500">{formatDate(token.created_at)}</div>
          <div class="text-slate-500">{formatDate(token.last_used_at)}</div>
          <div>
            <button type="button" onclick={() => revokeToken(token.id)} disabled={busyAction !== null} class="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60">
              <span class="material-symbols-outlined text-sm">delete</span>
            </button>
          </div>
        </div>
      {/each}
      {/if}
    </div>
  </section>

  <!-- Webhooks -->
  <section class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-slate-900 dark:text-slate-100 text-xl font-bold leading-tight">Webhook Outbound</h2>
        <p class="text-slate-600 dark:text-slate-400 text-sm mt-1">Send budget alert events to external tools like Datadog, Grafana, or PagerDuty.</p>
      </div>
      <button type="button" onclick={() => { formError = null; showWebhookModal = true; }} class="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-primary hover:bg-primary/20 transition-colors text-sm font-semibold border border-primary/20">
        <span class="material-symbols-outlined text-sm">webhook</span>
        Add Endpoint
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      {#if webhooks.length === 0}
        <div class="rounded-xl border border-primary/20 bg-white p-5 text-sm text-slate-500">No outbound webhook endpoints configured yet.</div>
      {:else}
      {#each webhooks as wh}
        <div class="bg-white dark:bg-slate-800 p-5 rounded-xl border border-primary/20 shadow-sm flex flex-col gap-4 {wh.status !== 'active' ? 'opacity-75' : ''}">
          <div class="flex justify-between items-start">
            <div class="flex items-center gap-3">
              <div class="p-2 {wh.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'} rounded-lg">
                <span class="material-symbols-outlined">webhook</span>
              </div>
              <div>
                <h3 class="font-bold text-slate-900 dark:text-slate-100">{wh.name}</h3>
                <p class="text-xs text-slate-500 font-mono">{wh.id}</p>
              </div>
            </div>
            {#if wh.status === 'active'}
              <span class="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold rounded-full flex items-center gap-1">
                <div class="w-1.5 h-1.5 rounded-full bg-green-500"></div> Active
              </span>
            {:else}
              <span class="px-2 py-1 bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 text-xs font-bold rounded-full flex items-center gap-1">
                <div class="w-1.5 h-1.5 rounded-full bg-slate-400"></div> Disabled
              </span>
            {/if}
          </div>
          <div class="flex justify-between items-center mt-2 border-t border-slate-100 dark:border-slate-700 pt-3">
            <span class="text-xs text-slate-500">Last used: {formatDate(wh.last_used_at)}</span>
            <button type="button" onclick={() => removeWebhook(wh.id)} disabled={busyAction !== null} class="text-primary hover:underline text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60">
              Remove
            </button>
          </div>
        </div>
      {/each}
      {/if}
    </div>
  </section>

  <!-- API Quickstart -->
  <section class="flex flex-col gap-6">
    <div>
      <h2 class="text-slate-900 dark:text-slate-100 text-xl font-bold leading-tight">API Quickstart</h2>
      <p class="text-slate-600 dark:text-slate-400 text-sm mt-1">Current developer status for the backend surface that exists today.</p>
    </div>
    <div class="rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-lg">
      <div class="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800">
        <div class="flex gap-2">
          {#each snippetTabs as tab}
            <button
              onclick={() => (activeSnippetTab = tab)}
              class="text-xs font-medium px-3 py-1 rounded {activeSnippetTab === tab ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white transition-colors'}"
            >
              {tab}
            </button>
          {/each}
        </div>
        <button onclick={copySnippet} class="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-xs">
          <span class="material-symbols-outlined text-sm">content_copy</span>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div class="p-4 overflow-x-auto">
        <pre class="text-sm font-mono text-slate-300 leading-relaxed">Developer tokens are stored and revocable from this page.

Bearer-token API access is not wired into the current backend.

Use the authenticated app routes for live management today:
- /inventory
- /rules
- /integrations
- /team
- /mitigations
- /billing
- /audit
</pre>
      </div>
    </div>
  </section>
</div>

{#if showTokenModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button type="button" class="absolute inset-0 bg-black/30" aria-label="Close token modal" onclick={() => showTokenModal = false}></button>
    <div role="dialog" aria-modal="true" aria-labelledby="developer-token-title" class="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
      <div class="mb-6 flex items-center justify-between">
        <h2 id="developer-token-title" class="text-xl font-bold text-slate-900">Create Token</h2>
        <button type="button" class="rounded p-1 text-slate-400 hover:text-slate-600" onclick={() => showTokenModal = false}>
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="space-y-4">
        <div>
          <label for="developer-token-name" class="mb-2 block text-sm font-medium text-slate-800">Token name</label>
          <input id="developer-token-name" bind:value={tokenForm.name} class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div>
          <label for="developer-token-expiry" class="mb-2 block text-sm font-medium text-slate-800">Expires in days</label>
          <input id="developer-token-expiry" bind:value={tokenForm.expires_in_days} type="number" min="1" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        {#if latestToken}
          <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p class="font-semibold">Copy this token now. It will not be shown again.</p>
            <p class="mt-2 font-mono break-all">{latestToken}</p>
          </div>
        {/if}
        {#if formError}
          <p class="text-sm text-red-600">{formError}</p>
        {/if}
      </div>
      <div class="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
        <button type="button" class="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" onclick={() => showTokenModal = false}>
          Close
        </button>
        <button
          type="button"
          class="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          onclick={createToken}
          disabled={busyAction !== null || tokenForm.name.trim().length === 0}
        >
          Create
        </button>
      </div>
    </div>
  </div>
{/if}

{#if showWebhookModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button type="button" class="absolute inset-0 bg-black/30" aria-label="Close webhook modal" onclick={() => showWebhookModal = false}></button>
    <div role="dialog" aria-modal="true" aria-labelledby="developer-webhook-title" class="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
      <div class="mb-6 flex items-center justify-between">
        <h2 id="developer-webhook-title" class="text-xl font-bold text-slate-900">Add Webhook Endpoint</h2>
        <button type="button" class="rounded p-1 text-slate-400 hover:text-slate-600" onclick={() => showWebhookModal = false}>
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="space-y-4">
        <div>
          <label for="developer-webhook-name" class="mb-2 block text-sm font-medium text-slate-800">Name</label>
          <input id="developer-webhook-name" bind:value={webhookForm.name} class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div>
          <label for="developer-webhook-url" class="mb-2 block text-sm font-medium text-slate-800">Destination URL</label>
          <input id="developer-webhook-url" bind:value={webhookForm.url} class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div>
          <label for="developer-webhook-secret" class="mb-2 block text-sm font-medium text-slate-800">Optional secret</label>
          <input id="developer-webhook-secret" bind:value={webhookForm.secret} class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        {#if formError}
          <p class="text-sm text-red-600">{formError}</p>
        {/if}
      </div>
      <div class="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
        <button type="button" class="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" onclick={() => showWebhookModal = false}>
          Cancel
        </button>
        <button
          type="button"
          class="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          onclick={createWebhook}
          disabled={busyAction !== null || webhookForm.name.trim().length === 0 || webhookForm.url.trim().length === 0}
        >
          Add Endpoint
        </button>
      </div>
    </div>
  </div>
{/if}
