<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { api, ApiRequestError } from '$lib/api.js';
	import type { PageData } from './$types.js';

	type ResourceType = 'zone' | 'worker' | 'r2_bucket' | 'kv_namespace' | 'd1_database';
	type MetricName = 'requests' | 'cached_requests' | 'bytes' | 'threats';
	type RuleOperator = 'gt' | 'lt' | 'gte' | 'lte';
	type RuleWindow = '5m' | '1h' | '1d';
	type Severity = 'warning' | 'high' | 'critical';
	type NotifyFrequency = 'instant' | 'hourly' | 'daily';

	interface RuleFormState {
		name: string;
		resource_type: ResourceType;
		resource_id: string;
		metric: MetricName;
		operator: RuleOperator;
		threshold: string;
		window: RuleWindow;
		severity: Severity;
		notify_frequency: NotifyFrequency;
	}

	let { data }: { data: PageData } = $props();

	let showModal = $state(false);
	let openMenuId = $state<string | null>(null);
	let busyAction = $state<string | null>(null);
	let formError = $state<string | null>(null);
	let form = $state<RuleFormState>({
		name: '',
		resource_type: 'zone',
		resource_id: '',
		metric: 'requests',
		operator: 'gt',
		threshold: '0',
		window: '5m',
		severity: 'warning',
		notify_frequency: 'instant',
	});

	const rules = $derived(data.rules);
	const resources = $derived(data.resources);
	const matchingResources = $derived(
		resources.filter((resource) => resource.type === form.resource_type),
	);

	const serviceMeta: Record<ResourceType, { label: string; icon: string }> = {
		zone: { label: 'Zone', icon: 'language' },
		worker: { label: 'Worker', icon: 'code' },
		r2_bucket: { label: 'R2 Bucket', icon: 'cloud' },
		kv_namespace: { label: 'KV Namespace', icon: 'storage' },
		d1_database: { label: 'D1 Database', icon: 'database' },
	};

	const metricLabels: Record<MetricName, string> = {
		requests: 'Requests',
		cached_requests: 'Cached requests',
		bytes: 'Bytes',
		threats: 'Threats',
	};

	const frequencyLabels: Record<NotifyFrequency, string> = {
		instant: 'Instant Alert',
		hourly: 'Hourly Digest',
		daily: 'Daily Summary',
	};

	const conditionClass: Record<Severity, string> = {
		critical: 'bg-red-50 text-red-700',
		high: 'bg-amber-50 text-amber-700',
		warning: 'bg-blue-50 text-blue-700',
	};

	function conditionLabel(rule: (typeof data.rules)[number]): string {
		const operatorLabel =
			rule.operator === 'gt'
				? '>'
				: rule.operator === 'gte'
					? '>='
					: rule.operator === 'lt'
						? '<'
						: '<=';
		return `${operatorLabel} ${rule.threshold} / ${rule.window}`;
	}

	function resourceLabel(rule: (typeof data.rules)[number]): string {
		if (!rule.resource_id) return serviceMeta[rule.resource_type].label;
		const resource = resources.find((entry) => entry.id === rule.resource_id);
		return resource ? resource.name : serviceMeta[rule.resource_type].label;
	}

	function resetForm() {
		form = {
			name: '',
			resource_type: 'zone',
			resource_id: '',
			metric: 'requests',
			operator: 'gt',
			threshold: '0',
			window: '5m',
			severity: 'warning',
			notify_frequency: 'instant',
		};
		formError = null;
	}

	function openCreateModal() {
		resetForm();
		showModal = true;
	}

	async function refreshRules() {
		openMenuId = null;
		await invalidateAll();
	}

	async function toggleRule(rule: (typeof data.rules)[number]) {
		busyAction = rule.id;
		try {
			await api.patch(`/rules/${rule.id}/toggle`);
			await refreshRules();
		} finally {
			busyAction = null;
		}
	}

	async function deleteRule(ruleId: string) {
		busyAction = ruleId;
		try {
			await api.delete(`/rules/${ruleId}`);
			await refreshRules();
		} finally {
			busyAction = null;
		}
	}

	async function createRule() {
		formError = null;
		busyAction = 'create-rule';
		try {
			await api.post('/rules', {
				name: form.name.trim(),
				resource_type: form.resource_type,
				resource_id: form.resource_id || undefined,
				metric: form.metric,
				operator: form.operator,
				threshold: Number(form.threshold),
				window: form.window,
				severity: form.severity,
				notify_frequency: form.notify_frequency,
				enabled: true,
			});
			showModal = false;
			await refreshRules();
		} catch (error) {
			if (error instanceof ApiRequestError) {
				formError = error.message;
			} else {
				formError = 'Unable to create rule right now.';
			}
		} finally {
			busyAction = null;
		}
	}
</script>

<!-- Header -->
<div class="flex flex-wrap items-center justify-between gap-4 mb-6">
	<div class="flex flex-col gap-1">
		<h1 class="text-slate-900 text-2xl sm:text-[28px] font-bold leading-tight">Rules &amp; Limits</h1>
		<p class="text-slate-500 text-sm font-normal leading-normal">Manage active monitoring rules to prevent unexpected costs.</p>
	</div>
	<button
		type="button"
		onclick={openCreateModal}
		class="flex items-center justify-center gap-2 rounded-lg px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium leading-normal transition-colors shadow-sm"
	>
		<span class="material-symbols-outlined !text-[20px]">add</span>
		<span>Create New Rule</span>
	</button>
</div>

<!-- Table Card -->
<div class="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm mb-6">
	<div class="overflow-x-auto">
		<table class="w-full text-left border-collapse">
			<thead>
				<tr class="bg-slate-50 border-b border-slate-200">
					<th class="px-6 py-4 text-slate-700 text-sm font-semibold leading-normal w-1/3 min-w-[200px]">Rule Name</th>
					<th class="px-6 py-4 text-slate-700 text-sm font-semibold leading-normal w-1/4 min-w-[150px]">Condition</th>
					<th class="px-6 py-4 text-slate-700 text-sm font-semibold leading-normal w-1/6 min-w-[120px]">Service</th>
					<th class="px-6 py-4 text-slate-700 text-sm font-semibold leading-normal w-1/6 min-w-[120px]">Status</th>
					<th class="px-6 py-4 w-[60px]"></th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100">
				{#if rules.length === 0}
					<tr>
						<td colspan="5" class="px-6 py-10 text-center text-sm text-slate-500">
							No monitoring rules yet.
						</td>
					</tr>
				{:else}
				{#each rules as row}
					<tr class="hover:bg-slate-50/50 transition-colors">
						<td class="px-6 py-4 text-slate-900 text-sm font-medium leading-normal">
							<div class="flex items-center gap-2">
								<span class="material-symbols-outlined text-slate-400 !text-[18px]">
									{serviceMeta[row.resource_type].icon}
								</span>
								{row.name}
							</div>
						</td>
						<td class="px-6 py-4">
							<span class="{conditionClass[row.severity]} px-2 py-1 rounded text-xs font-mono">
								{metricLabels[row.metric]} {conditionLabel(row)}
							</span>
						</td>
						<td class="px-6 py-4">
							<span class="inline-flex items-center justify-center rounded-md px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
								{resourceLabel(row)}
							</span>
						</td>
						<td class="px-6 py-4">
							<button
								type="button"
								onclick={() => toggleRule(row)}
								role="switch"
								aria-checked={row.enabled === 1}
								aria-label="Toggle {row.name}"
								disabled={busyAction !== null}
								class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none
									{row.enabled === 1 ? 'bg-primary' : 'bg-slate-200'} disabled:cursor-not-allowed disabled:opacity-60"
							>
								<span class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
									{row.enabled === 1 ? 'translate-x-4' : 'translate-x-0'}">
								</span>
							</button>
						</td>
						<td class="relative px-6 py-4 text-right">
							<button
								type="button"
								aria-label="More options"
								aria-expanded={openMenuId === row.id}
								class="text-slate-400 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
								onclick={() => openMenuId = openMenuId === row.id ? null : row.id}
								disabled={busyAction !== null}
							>
								<span class="material-symbols-outlined !text-[20px]">more_vert</span>
							</button>
							{#if openMenuId === row.id}
								<div class="absolute right-6 z-10 mt-2 w-40 rounded-lg border border-slate-200 bg-white py-1 text-left shadow-lg">
									<button
										type="button"
										class="block w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
										onclick={() => deleteRule(row.id)}
									>
										Delete rule
									</button>
								</div>
							{/if}
						</td>
					</tr>
				{/each}
				{/if}
			</tbody>
		</table>
	</div>
</div>

<!-- Info banner -->
<div class="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 items-start">
	<span class="material-symbols-outlined text-blue-500 mt-0.5">info</span>
	<div class="flex flex-col gap-1 text-sm text-blue-800">
		<p class="font-medium">Current backend rule scope</p>
		<p class="text-blue-600">
			Rules currently support requests, cached requests, bytes, and threats across monitored Cloudflare resource types. Endpoint- and geography-specific rule builders are not wired yet.
		</p>
	</div>
</div>

<!-- Modal — Create New Rule -->
{#if showModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<button type="button" aria-label="Close modal" class="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onclick={() => showModal = false}></button>
		<div role="dialog" aria-modal="true" aria-labelledby="rule-modal-title" class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
			<div class="flex items-center justify-between mb-7">
				<h2 id="rule-modal-title" class="text-xl font-bold text-slate-900">Create New Rule</h2>
				<button type="button" onclick={() => showModal = false} class="p-1 text-slate-400 hover:text-slate-600 rounded">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<div class="space-y-5">
				<div>
					<label class="block text-sm font-bold text-slate-800 mb-2" for="rule-name">1. Rule Name</label>
					<input type="text" id="rule-name" bind:value={form.name} placeholder="e.g., Critical Traffic Spike"
						class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50" />
				</div>

				<div>
					<label class="block text-sm font-bold text-slate-800 mb-2" for="rule-service">2. Service Selection</label>
					<div class="relative">
						<select id="rule-service" bind:value={form.resource_type} class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-primary/20">
							{#each Object.entries(serviceMeta) as [value, meta]}
								<option value={value}>{meta.label}</option>
							{/each}
						</select>
						<span class="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 pointer-events-none !text-[20px]">expand_more</span>
					</div>
				</div>

				<div>
					<label class="block text-sm font-bold text-slate-800 mb-2" for="rule-resource">3. Resource Scope</label>
					<div class="relative">
						<select id="rule-resource" bind:value={form.resource_id} class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-primary/20">
							<option value="">All {serviceMeta[form.resource_type].label.toLowerCase()} resources</option>
							{#each matchingResources as resource}
								<option value={resource.id}>{resource.name}</option>
							{/each}
						</select>
						<span class="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 pointer-events-none !text-[20px]">expand_more</span>
					</div>
				</div>

				<div>
					<label class="block text-sm font-bold text-slate-800 mb-2" for="rule-condition-metric">4. Condition</label>
					<div class="flex items-center gap-2">
						<div class="relative">
							<select id="rule-condition-metric" bind:value={form.metric} class="pl-3 pr-8 py-2.5 border border-slate-200 rounded-xl text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-primary/20">
								{#each Object.entries(metricLabels) as [value, label]}
									<option value={value}>{label}</option>
								{/each}
							</select>
							<span class="material-symbols-outlined absolute right-2 top-2.5 text-slate-400 pointer-events-none !text-[16px]">expand_more</span>
						</div>
						<div class="relative">
							<select bind:value={form.operator} class="pl-3 pr-8 py-2.5 border border-slate-200 rounded-xl text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-primary/20">
								<option value="gt">&gt;</option>
								<option value="gte">&gt;=</option>
								<option value="lt">&lt;</option>
								<option value="lte">&lt;=</option>
							</select>
							<span class="material-symbols-outlined absolute right-2 top-2.5 text-slate-400 pointer-events-none !text-[16px]">expand_more</span>
						</div>
						<div class="flex-1 flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50">
							<input type="number" bind:value={form.threshold} min="0" step="0.01" class="flex-1 px-3 py-2.5 text-sm focus:outline-none" />
						</div>
						<div class="relative">
							<select bind:value={form.window} class="pl-3 pr-8 py-2.5 border border-slate-200 rounded-xl text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-primary/20">
								<option value="5m">5m</option>
								<option value="1h">1h</option>
								<option value="1d">1d</option>
							</select>
							<span class="material-symbols-outlined absolute right-2 top-2.5 text-slate-400 pointer-events-none !text-[16px]">expand_more</span>
						</div>
					</div>
				</div>

				<div>
					<label class="block text-sm font-bold text-slate-800 mb-2" for="rule-severity">5. Severity</label>
					<div class="relative">
						<select id="rule-severity" bind:value={form.severity} class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-primary/20">
							<option value="warning">Warning</option>
							<option value="high">High</option>
							<option value="critical">Critical</option>
						</select>
						<span class="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 pointer-events-none !text-[20px]">expand_more</span>
					</div>
				</div>

				<div>
					<label class="block text-sm font-bold text-slate-800 mb-2" for="rule-frequency">6. Notification Frequency</label>
					<div class="relative">
						<select id="rule-frequency" bind:value={form.notify_frequency} class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-primary/20">
							{#each Object.entries(frequencyLabels) as [value, label]}
								<option value={value}>{label}</option>
							{/each}
						</select>
						<span class="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 pointer-events-none !text-[20px]">expand_more</span>
					</div>
				</div>

				{#if formError}
					<p class="text-sm text-red-600">{formError}</p>
				{/if}
			</div>

			<div class="flex items-center justify-end gap-3 mt-8 pt-5 border-t border-slate-100">
				<button type="button" onclick={() => showModal = false}
					class="px-5 py-2.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50">
					Cancel
				</button>
				<button
					type="button"
					class="px-5 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary/90 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
					onclick={createRule}
					disabled={busyAction !== null || form.name.trim().length === 0 || Number(form.threshold) <= 0}
				>
					Create Rule
				</button>
			</div>
		</div>
	</div>
{/if}
