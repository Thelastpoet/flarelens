<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { api, ApiRequestError } from '$lib/api.js';
	import type { PageData } from './$types.js';

	type IntegrationType = 'slack' | 'discord' | 'teams' | 'pagerduty' | 'webhook';

	interface CardMeta {
		icon: string;
		iconBg: string;
		iconColor: string;
		name: string;
		description: string;
	}

	interface StandardFormState {
		name: string;
		webhook_url: string;
		routing_key: string;
	}

	interface WebhookFormState {
		name: string;
		url: string;
		secret: string;
	}

	let { data }: { data: PageData } = $props();

	let selectedType = $state<IntegrationType | null>(null);
	let busyAction = $state<string | null>(null);
	let formError = $state<string | null>(null);
	let standardForm = $state<StandardFormState>({
		name: '',
		webhook_url: '',
		routing_key: '',
	});
	let webhookForm = $state<WebhookFormState>({
		name: '',
		url: '',
		secret: '',
	});

	const liveIntegrations = $derived(data.integrations);

	const cardMeta: Record<IntegrationType, CardMeta> = {
		slack: {
			icon: 'forum',
			iconBg: 'bg-[#E01E5A]/10',
			iconColor: 'text-[#E01E5A]',
			name: 'Slack',
			description: "Send real-time alerts and budget reports directly to your team's Slack channels.",
		},
		discord: {
			icon: 'sports_esports',
			iconBg: 'bg-[#5865F2]/10',
			iconColor: 'text-[#5865F2]',
			name: 'Discord',
			description: 'Receive automated notifications and usage warnings in your Discord server.',
		},
		teams: {
			icon: 'groups',
			iconBg: 'bg-[#6264A7]/10',
			iconColor: 'text-[#6264A7]',
			name: 'Microsoft Teams',
			description: 'Integrate budget alerts directly into your Microsoft Teams workflow.',
		},
		pagerduty: {
			icon: 'contact_phone',
			iconBg: 'bg-[#06AC38]/10',
			iconColor: 'text-[#06AC38]',
			name: 'PagerDuty',
			description: 'Trigger PagerDuty incidents when critical budget thresholds are exceeded.',
		},
		webhook: {
			icon: 'webhook',
			iconBg: 'bg-slate-800/10',
			iconColor: 'text-slate-800',
			name: 'Custom Webhooks',
			description: 'Send JSON payloads to your own endpoints for custom automation and reporting.',
		},
	};

	function singleIntegration(
		type: Exclude<IntegrationType, 'webhook'>,
	): (typeof data.integrations)[number] | null {
		return liveIntegrations.find((integration) => integration.type === type) || null;
	}

	function webhookIntegrations(): (typeof data.integrations)[number][] {
		return liveIntegrations.filter((integration) => integration.type === 'webhook');
	}

	const cards = $derived.by(() =>
		(Object.entries(cardMeta) as [IntegrationType, CardMeta][]).map(([type, meta]) => {
			if (type === 'webhook') {
				const count = webhookIntegrations().length;
				return {
					type,
					...meta,
					statusLabel: count > 0 ? `${count} Active` : 'Not Connected',
					connected: count > 0,
					actionLabel: count > 0 ? 'Manage Webhooks' : 'Add Webhook',
					actionVariant: count > 0 ? 'outline' : 'primary',
				};
			}

			const integration = singleIntegration(type);
			return {
				type,
				...meta,
				statusLabel: integration ? 'Connected' : 'Not Connected',
				connected: integration !== null,
				actionLabel: integration ? 'Configure' : 'Connect',
				actionVariant: integration ? 'outline' : 'primary',
			};
		}),
	);

	function resetForms(type: IntegrationType) {
		formError = null;
		if (type === 'webhook') {
			webhookForm = { name: 'Webhook', url: '', secret: '' };
			return;
		}
		standardForm = {
			name: cardMeta[type].name,
			webhook_url: '',
			routing_key: '',
		};
	}

	function openModal(type: IntegrationType) {
		selectedType = type;
		resetForms(type);
	}

	async function refreshIntegrations() {
		await invalidateAll();
	}

	async function submitStandard(type: Exclude<IntegrationType, 'webhook'>) {
		formError = null;
		busyAction = `save-${type}`;
		try {
			const body =
				type === 'pagerduty'
					? {
							name: standardForm.name.trim(),
							routing_key: standardForm.routing_key,
							severity_map: {
								warning: 'warning',
								high: 'error',
								critical: 'critical',
							},
						}
					: {
							name: standardForm.name.trim(),
							webhook_url: standardForm.webhook_url,
						};
			await api.post(`/integrations/${type}`, body);
			await refreshIntegrations();
		} catch (error) {
			formError =
				error instanceof ApiRequestError ? error.message : 'Unable to save integration right now.';
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
			webhookForm = { name: 'Webhook', url: '', secret: '' };
			await refreshIntegrations();
		} catch (error) {
			formError =
				error instanceof ApiRequestError ? error.message : 'Unable to create webhook right now.';
		} finally {
			busyAction = null;
		}
	}

	async function testIntegration(type: IntegrationType, id?: string) {
		formError = null;
		busyAction = `test-${id ?? type}`;
		try {
			const suffix = type === 'webhook' && id ? `?id=${encodeURIComponent(id)}` : '';
			await api.post(`/integrations/${type}/test${suffix}`);
			await refreshIntegrations();
		} catch (error) {
			formError =
				error instanceof ApiRequestError ? error.message : 'Integration test failed.';
		} finally {
			busyAction = null;
		}
	}

	async function deleteIntegration(id: string) {
		formError = null;
		busyAction = `delete-${id}`;
		try {
			await api.delete(`/integrations/${id}`);
			await refreshIntegrations();
		} catch (error) {
			formError =
				error instanceof ApiRequestError ? error.message : 'Unable to delete integration.';
		} finally {
			busyAction = null;
		}
	}

	function modalTitle(): string {
		return selectedType ? cardMeta[selectedType].name : '';
	}

	function isStandardIntegrationType(
		type: IntegrationType | null,
	): type is Exclude<IntegrationType, 'webhook'> {
		return type === 'slack' || type === 'discord' || type === 'teams' || type === 'pagerduty';
	}

	function currentPlanLabel(): string {
		return 'current plan';
	}
</script>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {#each cards as integration}
    <div class="flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div class="p-6 flex items-start justify-between">
        <div class="w-12 h-12 rounded-lg {integration.iconBg} flex items-center justify-center {integration.iconColor} mb-4">
          <span class="material-symbols-outlined" style="font-size: 28px;">{integration.icon}</span>
        </div>
        {#if integration.connected}
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            {integration.statusLabel}
          </span>
        {:else}
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {integration.statusLabel}
          </span>
        {/if}
      </div>
      <div class="px-6 pb-4 flex-1">
        <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">{integration.name}</h3>
        <p class="text-slate-500 dark:text-slate-400 text-sm line-clamp-2">{integration.description}</p>
      </div>
      <div class="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 mt-auto">
        {#if integration.actionVariant === 'outline'}
          <button
            type="button"
            onclick={() => openModal(integration.type)}
            class="w-full flex items-center justify-center h-9 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {integration.actionLabel}
          </button>
        {:else}
          <button
            type="button"
            onclick={() => openModal(integration.type)}
            class="w-full flex items-center justify-center h-9 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {integration.actionLabel}
          </button>
        {/if}
      </div>
    </div>
  {/each}

  <!-- Request Integration placeholder -->
  <div class="flex flex-col bg-transparent rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 justify-center items-center min-h-[240px]">
    <div class="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 mb-4">
      <span class="material-symbols-outlined" style="font-size: 24px;">add</span>
    </div>
    <h3 class="text-base font-medium text-slate-900 dark:text-slate-100 mb-1">Request Integration</h3>
    <p class="text-slate-500 dark:text-slate-400 text-sm text-center px-6">Don't see your tool? Let us know what you'd like to connect.</p>
  </div>
</div>

{#if selectedType}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button
      type="button"
      class="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
      aria-label="Close integration modal"
      onclick={() => selectedType = null}
    ></button>
    <div role="dialog" aria-modal="true" aria-labelledby="integration-modal-title" class="relative w-full max-w-xl rounded-2xl bg-white p-8 shadow-2xl">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h2 id="integration-modal-title" class="text-xl font-bold text-slate-900">{modalTitle()}</h2>
          <p class="mt-1 text-sm text-slate-500">Manage alert delivery for your {currentPlanLabel()}.</p>
        </div>
        <button
          type="button"
          class="rounded p-1 text-slate-400 hover:text-slate-600"
          aria-label="Close integration modal"
          onclick={() => selectedType = null}
        >
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      {#if selectedType === 'webhook'}
        <div class="space-y-6">
          <div class="space-y-3">
            <h3 class="text-sm font-semibold text-slate-900">Existing webhooks</h3>
            {#if webhookIntegrations().length === 0}
              <div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No webhooks configured yet.
              </div>
            {:else}
              {#each webhookIntegrations() as webhook}
                <div class="rounded-xl border border-slate-200 px-4 py-3">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="text-sm font-medium text-slate-900">{webhook.name}</p>
                      <p class="text-xs text-slate-500">
                        {webhook.last_used_at ? `Last tested or used ${new Date(webhook.last_used_at).toLocaleString()}` : 'Not tested yet'}
                      </p>
                    </div>
                    <div class="flex gap-2">
                      <button
                        type="button"
                        class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        onclick={() => testIntegration('webhook', webhook.id)}
                        disabled={busyAction !== null}
                      >
                        Test
                      </button>
                      <button
                        type="button"
                        class="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        onclick={() => deleteIntegration(webhook.id)}
                        disabled={busyAction !== null}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              {/each}
            {/if}
          </div>

          <div class="space-y-4 border-t border-slate-100 pt-6">
            <h3 class="text-sm font-semibold text-slate-900">Add webhook</h3>
            <div>
              <label class="mb-2 block text-sm font-medium text-slate-800" for="webhook-name">Name</label>
              <input id="webhook-name" bind:value={webhookForm.name} class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label class="mb-2 block text-sm font-medium text-slate-800" for="webhook-url">Destination URL</label>
              <input id="webhook-url" bind:value={webhookForm.url} class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label class="mb-2 block text-sm font-medium text-slate-800" for="webhook-secret">Optional secret</label>
              <input id="webhook-secret" bind:value={webhookForm.secret} class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <button
              type="button"
              class="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              onclick={createWebhook}
              disabled={busyAction !== null || webhookForm.name.trim().length === 0 || webhookForm.url.trim().length === 0}
            >
              Add Webhook
            </button>
          </div>
        </div>
      {:else}
        {@const existing = selectedType ? singleIntegration(selectedType) : null}
        {@const standardType = isStandardIntegrationType(selectedType) ? selectedType : null}
        <div class="space-y-5">
          {#if existing}
            <div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p class="text-sm font-medium text-slate-900">{existing.name}</p>
              <p class="mt-1 text-xs text-slate-500">
                {existing.last_used_at ? `Last tested or used ${new Date(existing.last_used_at).toLocaleString()}` : 'Configured but not tested yet'}
              </p>
            </div>
          {/if}

          <div>
            <label class="mb-2 block text-sm font-medium text-slate-800" for="integration-name">Display name</label>
            <input id="integration-name" bind:value={standardForm.name} class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>

          {#if selectedType === 'pagerduty'}
            <div>
              <label class="mb-2 block text-sm font-medium text-slate-800" for="pagerduty-key">Routing key</label>
              <input id="pagerduty-key" bind:value={standardForm.routing_key} class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          {:else}
            <div>
              <label class="mb-2 block text-sm font-medium text-slate-800" for="integration-webhook">Webhook URL</label>
              <input id="integration-webhook" bind:value={standardForm.webhook_url} class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          {/if}

          <div class="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              class="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              onclick={() => standardType && submitStandard(standardType)}
              disabled={busyAction !== null || standardType === null || standardForm.name.trim().length === 0 || (standardType === 'pagerduty' ? standardForm.routing_key.trim().length === 0 : standardForm.webhook_url.trim().length === 0)}
            >
              {existing ? 'Update' : 'Connect'}
            </button>
            {#if existing}
              <button
                type="button"
                class="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                onclick={() => standardType && testIntegration(standardType, existing.id)}
                disabled={busyAction !== null}
              >
                Send Test
              </button>
              <button
                type="button"
                class="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                onclick={() => deleteIntegration(existing.id)}
                disabled={busyAction !== null}
              >
                Delete
              </button>
            {/if}
          </div>
        </div>
      {/if}

      {#if formError}
        <p class="mt-4 text-sm text-red-600">{formError}</p>
      {/if}
    </div>
  </div>
{/if}
