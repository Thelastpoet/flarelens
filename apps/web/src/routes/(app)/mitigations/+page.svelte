<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { api, ApiRequestError } from '$lib/api.js';
	import type { MitigationsPageData } from '$lib/server/mitigations.js';
	import type { PageData } from './$types.js';

	type MetricName = 'requests' | 'cached_requests' | 'bytes' | 'threats';
	type RuleOperator = 'gt' | 'lt' | 'gte' | 'lte';
	type ActionType = 'rate_limit' | 'under_attack_mode' | 'pause_worker';

	interface RateLimitConfig {
		zone_id: string;
		threshold: number;
		period: number;
		url_pattern?: string;
		action_mode?: 'ban' | 'challenge' | 'js_challenge' | 'managed_challenge';
		dry_run?: boolean;
	}

	interface UnderAttackConfig {
		zone_id: string;
		security_level?: 'under_attack' | 'high' | 'medium';
		dry_run?: boolean;
	}

	interface PauseWorkerConfig {
		worker_name: string;
		dry_run?: boolean;
	}

	interface MitigationFormState {
		id?: string;
		name: string;
		resource_id: string;
		metric: MetricName;
		operator: RuleOperator;
		threshold: string;
		action_type: ActionType;
		rate_limit_threshold: string;
		rate_limit_period: string;
		url_pattern: string;
		action_mode: 'challenge' | 'managed_challenge' | 'js_challenge' | 'ban';
		security_level: 'under_attack' | 'high' | 'medium';
		worker_name: string;
	}

	let { data }: { data: PageData } = $props();

	let showModal = $state(false);
	let busyAction = $state<string | null>(null);
	let formError = $state<string | null>(null);
	let editingId = $state<string | null>(null);
	let form = $state<MitigationFormState>({
		name: '',
		resource_id: '',
		metric: 'requests',
		operator: 'gt',
		threshold: '1000',
		action_type: 'rate_limit',
		rate_limit_threshold: '100',
		rate_limit_period: '60',
		url_pattern: '',
		action_mode: 'challenge',
		security_level: 'under_attack',
		worker_name: '',
	});

	const mitigations = $derived(data.mitigations);
	const resources = $derived(data.resources);
	const activeCount = $derived(mitigations.filter((mitigation) => mitigation.enabled === 1).length);

	const zones = $derived(resources.filter((resource) => resource.type === 'zone'));
	const workers = $derived(resources.filter((resource) => resource.type === 'worker'));

	const metricLabels: Record<MetricName, string> = {
		requests: 'Requests',
		cached_requests: 'Cached requests',
		bytes: 'Bytes',
		threats: 'Threats',
	};

	const actionMeta: Record<ActionType, { icon: string; iconColor: string; label: string }> = {
		rate_limit: {
			icon: 'speed',
			iconColor: 'text-amber-500',
			label: 'Rate limit',
		},
		under_attack_mode: {
			icon: 'security',
			iconColor: 'text-rose-500',
			label: 'Under Attack Mode',
		},
		pause_worker: {
			icon: 'pause_circle',
			iconColor: 'text-indigo-500',
			label: 'Pause Worker',
		},
	};

	function operatorLabel(operator: RuleOperator): string {
		return operator === 'gt'
			? '>'
			: operator === 'gte'
				? '>='
				: operator === 'lt'
					? '<'
					: '<=';
	}

	function triggerLabel(mitigation: (typeof data.mitigations)[number]): string {
		const trigger = mitigation.trigger;
		return `${metricLabels[trigger.metric]} ${operatorLabel(trigger.operator)} ${trigger.threshold}`;
	}

	function resourceName(resourceId: string | null): string | null {
		if (!resourceId) return null;
		return resources.find((resource) => resource.id === resourceId)?.name ?? null;
	}

	function actionLabel(mitigation: (typeof data.mitigations)[number]): string {
		if (mitigation.action_type === 'rate_limit') {
			return `Apply ${mitigation.action.threshold} req/${mitigation.action.period}s limit`;
		}
		if (mitigation.action_type === 'under_attack_mode') {
			return `Set security level to ${mitigation.action.security_level}`;
		}
		return `Pause worker ${mitigation.action.worker_name}`;
	}

	function lastTriggeredLabel(mitigation: (typeof data.mitigations)[number]): string {
		if (!mitigation.last_triggered) return 'Never';
		const diff = Date.now() - new Date(mitigation.last_triggered).getTime();
		const minutes = Math.floor(diff / 60000);
		if (minutes < 1) return 'just now';
		if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
		const days = Math.floor(hours / 24);
		return `${days} day${days === 1 ? '' : 's'} ago`;
	}

	function statLabel(
		mitigation: (typeof data.mitigations)[number],
	): { text: string; className: string } | null {
		if (mitigation.estimated_savings > 0) {
			return {
				text: `Saved est. $${mitigation.estimated_savings.toFixed(2)}`,
				className: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30',
			};
		}
		if (mitigation.enabled === 1) {
			return {
				text: `Triggered ${mitigation.trigger_count} time${mitigation.trigger_count === 1 ? '' : 's'}`,
				className: 'text-slate-500',
			};
		}
		return null;
	}

	function resetForm() {
		editingId = null;
		formError = null;
		form = {
			name: '',
			resource_id: '',
			metric: 'requests',
			operator: 'gt',
			threshold: '1000',
			action_type: 'rate_limit',
			rate_limit_threshold: '100',
			rate_limit_period: '60',
			url_pattern: '',
			action_mode: 'challenge',
			security_level: 'under_attack',
			worker_name: workers[0]?.name ?? '',
		};
	}

	function openCreateModal() {
		resetForm();
		showModal = true;
	}

	function openEditModal(mitigation: (typeof data.mitigations)[number]) {
		editingId = mitigation.id;
		formError = null;
		form = {
			id: mitigation.id,
			name: mitigation.name,
			resource_id: mitigation.resource_id ?? '',
			metric: mitigation.trigger.metric as MetricName,
			operator: mitigation.trigger.operator,
			threshold: String(mitigation.trigger.threshold),
			action_type: mitigation.action_type,
			rate_limit_threshold:
				mitigation.action_type === 'rate_limit'
					? String(mitigation.action.threshold)
					: '100',
			rate_limit_period:
				mitigation.action_type === 'rate_limit'
					? String(mitigation.action.period)
					: '60',
			url_pattern:
				mitigation.action_type === 'rate_limit'
					? (mitigation.action.url_pattern ?? '')
					: '',
			action_mode:
				mitigation.action_type === 'rate_limit'
					? mitigation.action.action_mode
					: 'challenge',
			security_level:
				mitigation.action_type === 'under_attack_mode'
					? mitigation.action.security_level
					: 'under_attack',
			worker_name:
				mitigation.action_type === 'pause_worker'
					? mitigation.action.worker_name
					: '',
		};
		showModal = true;
	}

	function zoneIdForForm(): string {
		const resource = resources.find((item) => item.id === form.resource_id);
		if (!resource) {
			throw new Error(`Mitigation form references unknown resource ${form.resource_id}`);
		}
		return resource.cf_resource_id;
	}

	function buildCreatePayload() {
		const trigger_condition = {
			metric: form.metric,
			operator: form.operator,
			threshold: Number(form.threshold),
		};

		if (form.action_type === 'rate_limit') {
			return {
				name: form.name.trim(),
				trigger_type: 'traffic_rate' as const,
				trigger_condition,
				action_type: 'rate_limit' as const,
				action_config: {
					zone_id: zoneIdForForm(),
					threshold: Number(form.rate_limit_threshold),
					period: Number(form.rate_limit_period),
					url_pattern: form.url_pattern || undefined,
					action_mode: form.action_mode,
					dry_run: true,
				},
				resource_id: form.resource_id || undefined,
			};
		}

		if (form.action_type === 'under_attack_mode') {
			return {
				name: form.name.trim(),
				trigger_type: 'traffic_rate' as const,
				trigger_condition,
				action_type: 'under_attack_mode' as const,
				action_config: {
					zone_id: zoneIdForForm(),
					security_level: form.security_level,
					dry_run: true,
				},
				resource_id: form.resource_id || undefined,
			};
		}

		return {
			name: form.name.trim(),
			trigger_type: 'traffic_rate' as const,
			trigger_condition,
			action_type: 'pause_worker' as const,
			action_config: {
				worker_name: form.worker_name,
				dry_run: true,
			},
			resource_id: form.resource_id || undefined,
		};
	}

	function buildUpdatePayload() {
		const trigger_condition = {
			metric: form.metric,
			operator: form.operator,
			threshold: Number(form.threshold),
		};

		if (form.action_type === 'rate_limit') {
			return {
				name: form.name.trim(),
				trigger_condition,
				action_config: {
					zone_id: zoneIdForForm(),
					threshold: Number(form.rate_limit_threshold),
					period: Number(form.rate_limit_period),
					url_pattern: form.url_pattern || undefined,
					action_mode: form.action_mode,
					dry_run: true,
				},
				resource_id: form.resource_id || null,
			};
		}

		if (form.action_type === 'under_attack_mode') {
			return {
				name: form.name.trim(),
				trigger_condition,
				action_config: {
					zone_id: zoneIdForForm(),
					security_level: form.security_level,
					dry_run: true,
				},
				resource_id: form.resource_id || null,
			};
		}

		return {
			name: form.name.trim(),
			trigger_condition,
			action_config: {
				worker_name: form.worker_name,
				dry_run: true,
			},
			resource_id: form.resource_id || null,
		};
	}

	async function refreshMitigations() {
		await invalidateAll();
	}

	async function saveMitigation() {
		formError = null;
		busyAction = editingId ?? 'create';
		try {
			if (editingId) {
				await api.patch(`/mitigations/${editingId}`, buildUpdatePayload());
			} else {
				await api.post('/mitigations', buildCreatePayload());
			}
			showModal = false;
			await refreshMitigations();
		} catch (error) {
			formError = error instanceof ApiRequestError ? error.message : 'Unable to save mitigation.';
		} finally {
			busyAction = null;
		}
	}

	async function toggleMitigation(id: string) {
		busyAction = `toggle-${id}`;
		try {
			await api.patch(`/mitigations/${id}/toggle`);
			await refreshMitigations();
		} finally {
			busyAction = null;
		}
	}

	async function deleteMitigation(id: string) {
		busyAction = `delete-${id}`;
		try {
			await api.delete(`/mitigations/${id}`);
			await refreshMitigations();
		} finally {
			busyAction = null;
		}
	}

	async function triggerDryRun(id: string) {
		formError = null;
		busyAction = `trigger-${id}`;
		try {
			await api.post(`/mitigations/${id}/trigger`, { dry_run: true, confirm: false });
			await refreshMitigations();
		} catch (error) {
			formError = error instanceof ApiRequestError ? error.message : 'Dry-run trigger failed.';
		} finally {
			busyAction = null;
		}
	}
</script>

<div class="max-w-5xl mx-auto space-y-6">
  <!-- Page header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Automated Mitigation Rules</h1>
      <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage rules to prevent unexpected infrastructure costs and anomalies.</p>
    </div>
    <div class="flex items-center gap-2">
      <span class="text-sm text-slate-500">Status:</span>
      {#if activeCount > 0}
        <span class="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
        </span>
      {:else}
        <span class="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
          <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Inactive
        </span>
      {/if}
    </div>
  </div>

  <!-- Rules list -->
  <div class="grid gap-4">
    {#if mitigations.length === 0}
      <div class="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
        No mitigation rules yet.
      </div>
    {:else}
    {#each mitigations as rule}
      {@const meta = actionMeta[rule.action_type]}
      {@const stat = statLabel(rule)}
      <div class="flex flex-col md:flex-row items-stretch justify-between gap-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm {rule.enabled === 0 ? 'opacity-75' : ''}">
        <div class="flex flex-[2_2_0px] flex-col justify-between gap-4">
          <div>
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined {meta.iconColor}">{meta.icon}</span>
                <h3 class="text-lg font-bold text-slate-900 dark:text-white">{rule.name}</h3>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  class="sr-only peer"
                  checked={rule.enabled === 1}
                  onchange={() => toggleMitigation(rule.id)}
                  disabled={busyAction !== null}
                />
                <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-primary"></div>
              </label>
            </div>
            <div class="grid grid-cols-2 gap-4 mt-4">
              <div class="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
                <span class="text-xs text-slate-500 block mb-1">Trigger</span>
                <span class="text-sm font-medium text-slate-700 dark:text-slate-300">{triggerLabel(rule)}</span>
              </div>
              <div class="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
                <span class="text-xs text-slate-500 block mb-1">Action</span>
                <span class="text-sm font-medium text-slate-700 dark:text-slate-300">{actionLabel(rule)}</span>
              </div>
            </div>
            {#if resourceName(rule.resource_id)}
              <p class="mt-3 text-xs text-slate-500">Resource: {resourceName(rule.resource_id)}</p>
            {/if}
          </div>
          <div class="flex gap-2">
          <button
            type="button"
            onclick={() => openEditModal(rule)}
            class="inline-flex w-max items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <span class="material-symbols-outlined text-[18px]">edit</span>
            Edit Rule
          </button>
          <button
            type="button"
            onclick={() => triggerDryRun(rule.id)}
            disabled={busyAction !== null}
            class="inline-flex w-max items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span class="material-symbols-outlined text-[18px]">play_arrow</span>
            Dry Run
          </button>
          <button
            type="button"
            onclick={() => deleteMitigation(rule.id)}
            disabled={busyAction !== null}
            class="inline-flex w-max items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span class="material-symbols-outlined text-[18px]">delete</span>
            Delete
          </button>
          </div>
        </div>

        {#if rule.enabled === 0}
          <div class="w-full md:w-64 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex-shrink-0 flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-700">
            <div class="p-4 text-center">
              <span class="material-symbols-outlined text-slate-400 mb-1">power_settings_new</span>
              <div class="text-sm text-slate-500">Rule is currently disabled</div>
            </div>
          </div>
        {:else}
          <div class="w-full md:w-64 bg-slate-100 dark:bg-slate-800 rounded-lg flex-shrink-0 flex items-center justify-center border border-slate-200 dark:border-slate-700 {rule.last_triggered === null ? 'opacity-50' : ''}">
            <div class="p-4 text-center">
              <div class="text-xs text-slate-500 mb-1">Last triggered</div>
              <div class="text-sm font-medium text-slate-900 dark:text-white">{lastTriggeredLabel(rule)}</div>
              {#if stat}
                <div class="mt-2 text-xs py-1 px-2 rounded-md {stat.className}">{stat.text}</div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    {/each}
    {/if}
  </div>
</div>

<div class="fixed bottom-6 right-6">
  <button
    type="button"
    onclick={openCreateModal}
    class="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-primary/90"
  >
    <span class="material-symbols-outlined text-[18px]">add</span>
    New Mitigation
  </button>
</div>

{#if showModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button type="button" class="absolute inset-0 bg-black/30" aria-label="Close mitigation modal" onclick={() => showModal = false}></button>
    <div role="dialog" aria-modal="true" aria-labelledby="mitigation-modal-title" class="relative w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl">
      <div class="mb-6 flex items-center justify-between">
        <h2 id="mitigation-modal-title" class="text-xl font-bold text-slate-900">{editingId ? 'Edit Mitigation Rule' : 'Create Mitigation Rule'}</h2>
        <button type="button" class="rounded p-1 text-slate-400 hover:text-slate-600" onclick={() => showModal = false}>
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="grid gap-5 md:grid-cols-2">
        <div class="md:col-span-2">
          <label for="mitigation-name" class="mb-2 block text-sm font-medium text-slate-800">Rule Name</label>
          <input id="mitigation-name" bind:value={form.name} class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div>
          <label for="mitigation-resource" class="mb-2 block text-sm font-medium text-slate-800">Resource</label>
          <select id="mitigation-resource" bind:value={form.resource_id} class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="">Select a resource</option>
            {#each resources as resource}
              <option value={resource.id}>{resource.name}</option>
            {/each}
          </select>
        </div>
        <div>
          <label for="mitigation-action-type" class="mb-2 block text-sm font-medium text-slate-800">Action Type</label>
          <select id="mitigation-action-type" bind:value={form.action_type} class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="rate_limit">Rate limit</option>
            <option value="under_attack_mode">Under Attack Mode</option>
            <option value="pause_worker">Pause worker</option>
          </select>
        </div>
        <div>
          <label for="mitigation-metric" class="mb-2 block text-sm font-medium text-slate-800">Trigger Metric</label>
          <select id="mitigation-metric" bind:value={form.metric} class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
            {#each Object.entries(metricLabels) as [value, label]}
              <option value={value}>{label}</option>
            {/each}
          </select>
        </div>
        <div class="grid grid-cols-[120px_1fr] gap-3">
          <div>
            <label for="mitigation-operator" class="mb-2 block text-sm font-medium text-slate-800">Operator</label>
            <select id="mitigation-operator" bind:value={form.operator} class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="gt">&gt;</option>
              <option value="gte">&gt;=</option>
              <option value="lt">&lt;</option>
              <option value="lte">&lt;=</option>
            </select>
          </div>
          <div>
            <label for="mitigation-threshold" class="mb-2 block text-sm font-medium text-slate-800">Threshold</label>
            <input id="mitigation-threshold" bind:value={form.threshold} type="number" min="0" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>

        {#if form.action_type === 'rate_limit'}
          <div>
            <label for="mitigation-rate-threshold" class="mb-2 block text-sm font-medium text-slate-800">Rate Limit Threshold</label>
            <input id="mitigation-rate-threshold" bind:value={form.rate_limit_threshold} type="number" min="1" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label for="mitigation-rate-period" class="mb-2 block text-sm font-medium text-slate-800">Window Seconds</label>
            <input id="mitigation-rate-period" bind:value={form.rate_limit_period} type="number" min="10" class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label for="mitigation-action-mode" class="mb-2 block text-sm font-medium text-slate-800">Action Mode</label>
            <select id="mitigation-action-mode" bind:value={form.action_mode} class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="challenge">Challenge</option>
              <option value="managed_challenge">Managed challenge</option>
              <option value="js_challenge">JS challenge</option>
              <option value="ban">Ban</option>
            </select>
          </div>
          <div>
            <label for="mitigation-url-pattern" class="mb-2 block text-sm font-medium text-slate-800">Optional URL Pattern</label>
            <input id="mitigation-url-pattern" bind:value={form.url_pattern} class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="/login/*" />
          </div>
        {:else if form.action_type === 'under_attack_mode'}
          <div class="md:col-span-2">
            <label for="mitigation-security-level" class="mb-2 block text-sm font-medium text-slate-800">Security Level</label>
            <select id="mitigation-security-level" bind:value={form.security_level} class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="under_attack">Under attack</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
            </select>
          </div>
        {:else}
          <div class="md:col-span-2">
            <label for="mitigation-worker-name" class="mb-2 block text-sm font-medium text-slate-800">Worker Name</label>
            <select id="mitigation-worker-name" bind:value={form.worker_name} class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">Select worker</option>
              {#each workers as worker}
                <option value={worker.name}>{worker.name}</option>
              {/each}
            </select>
          </div>
        {/if}

        {#if formError}
          <p class="md:col-span-2 text-sm text-red-600">{formError}</p>
        {/if}
      </div>
      <div class="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
        <button type="button" class="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" onclick={() => showModal = false}>
          Cancel
        </button>
        <button
          type="button"
          class="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          onclick={saveMitigation}
          disabled={busyAction !== null || form.name.trim().length === 0 || form.resource_id === '' || Number(form.threshold) <= 0 || (form.action_type === 'pause_worker' ? form.worker_name === '' : zoneIdForForm() === '')}
        >
          {editingId ? 'Save Changes' : 'Create Rule'}
        </button>
      </div>
    </div>
  </div>
{/if}
