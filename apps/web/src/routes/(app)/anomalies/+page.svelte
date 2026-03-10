<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { api } from '$lib/api.js';
	import type { PageData } from './$types.js';

interface Attribution {
	label?: string;
	type?: string;
	value?: number;
	contributionPct?: number;
}

interface Anomaly {
	id: string;
	metric: string;
	severity: string;
	current_value: number;
	baseline_value?: number | null;
	deviation?: number | null;
	status: string;
	detected_at: string;
	resource_id?: string | null;
	detection_type?: string;
	attribution?: string | Attribution[] | null;
}

	let { data }: { data: PageData } = $props();

	const anomalies = $derived((data.anomalies ?? []) as Anomaly[]);

	const severityBadge: Record<string, string> = {
		critical: 'bg-red-100 text-red-700',
		high: 'bg-orange-100 text-orange-700',
		warning: 'bg-yellow-100 text-yellow-700',
		info: 'bg-blue-100 text-blue-700',
	};

	const severityDot: Record<string, string> = {
		critical: 'bg-red-500',
		high: 'bg-orange-500',
		warning: 'bg-yellow-400',
		info: 'bg-blue-400',
	};

	let selected = $state<string | null>(null);
	let dismissingId = $state<string | null>(null);
	const filter = $derived((data.status ?? 'all') as 'active' | 'dismissed' | 'resolved' | 'all');

function parseAttribution(raw: string | Attribution[] | null | undefined): Attribution[] {
	if (!raw) return [];
	if (Array.isArray(raw)) return raw;
	try {
		return JSON.parse(raw) as Attribution[];
	} catch {
		return [];
	}
}

function formatDetectedAt(iso: string): string {
	const date = new Date(iso);
	const now = Date.now();
	const diff = now - date.getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return 'just now';
	if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
	const days = Math.floor(hours / 24);
	return `${days} day${days === 1 ? '' : 's'} ago`;
}

async function dismiss(id: string) {
		dismissingId = id;
		try {
			await api.patch(`/anomalies/${id}/dismiss`);
			await invalidateAll();
			if (selected === id) selected = null;
		} finally {
			dismissingId = null;
		}
}

async function applyFilter(next: 'active' | 'dismissed' | 'all') {
	const target = next === 'all' ? '/anomalies' : `/anomalies?status=${next}`;
	await goto(target, { keepFocus: true, noScroll: true });
}
</script>

<div class="flex items-center justify-between mb-6">
	<div>
		<h1 class="text-2xl font-bold text-slate-900">Anomalies</h1>
		<p class="text-sm text-gray-500 mt-0.5">Detected traffic and cost anomalies across your infrastructure.</p>
	</div>
	<div role="tablist" aria-label="Anomaly status filters" class="flex items-center gap-2">
		<button type="button" role="tab" aria-selected={filter === 'active'} onclick={() => applyFilter('active')} class="px-3 py-1.5 text-sm rounded-lg {filter === 'active' ? 'bg-orange-500 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}">Active</button>
		<button type="button" role="tab" aria-selected={filter === 'dismissed'} onclick={() => applyFilter('dismissed')} class="px-3 py-1.5 text-sm rounded-lg {filter === 'dismissed' ? 'bg-orange-500 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}">Dismissed</button>
		<button type="button" role="tab" aria-selected={filter === 'all'} onclick={() => applyFilter('all')} class="px-3 py-1.5 text-sm rounded-lg {filter === 'all' ? 'bg-orange-500 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}">All</button>
	</div>
</div>

{#if anomalies.length === 0}
	<div class="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-12 text-center">
		<p class="text-gray-400 text-sm">No {filter === 'all' ? '' : filter + ' '}anomalies found.</p>
	</div>
{:else}
	<div class="space-y-3">
		{#each anomalies as anomaly}
			{@const attribution = parseAttribution(anomaly.attribution)}
			<div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
				<div class="flex">
					<div class="w-1 {severityDot[anomaly.severity] ?? 'bg-gray-300'} shrink-0"></div>
					<button
						type="button"
						class="flex-1 px-5 py-4 text-left hover:bg-gray-50/50 w-full"
						aria-expanded={selected === anomaly.id}
						aria-controls={`anomaly-detail-${anomaly.id}`}
						onclick={() => selected = selected === anomaly.id ? null : anomaly.id}
					>
						<div class="flex items-start justify-between gap-4">
							<div class="flex items-start gap-3">
								<div>
									<div class="flex items-center gap-2 mb-1">
										<span class="text-sm font-semibold text-slate-900">{anomaly.resource_id ?? anomaly.id}</span>
										{#if anomaly.detection_type}
											<span class="text-xs text-gray-400">{anomaly.detection_type}</span>
										{/if}
										<span class="text-xs font-medium px-2 py-0.5 rounded-full {severityBadge[anomaly.severity] ?? 'bg-gray-100 text-gray-700'}">{anomaly.severity}</span>
										{#if anomaly.status === 'dismissed'}
											<span class="text-xs text-gray-400 italic">dismissed</span>
										{/if}
									</div>
									<div class="text-sm text-gray-600">
										{anomaly.metric} spiked to <span class="font-semibold text-red-600">{anomaly.current_value}</span>
										{#if anomaly.baseline_value != null}
											(baseline: {anomaly.baseline_value}{#if anomaly.deviation != null} · <span class="text-red-500 font-medium">+{(anomaly.deviation * 100).toFixed(0)}%</span>{/if})
										{/if}
									</div>
									{#if attribution.length > 0}
										<div class="text-xs text-gray-400 mt-1">
											Top contributors: {attribution.map((a) => `${a.label ?? a.type ?? ''} (${a.contributionPct ?? 0}%)`).join(' · ')}
										</div>
									{/if}
								</div>
							</div>
							<div class="text-xs text-gray-400 whitespace-nowrap shrink-0">{formatDetectedAt(anomaly.detected_at)}</div>
						</div>
					</button>
					<div class="flex items-center gap-2 pr-4">
						<a
							href="/anomalies/{anomaly.id}"
							class="text-xs text-gray-400 hover:text-orange-600 px-2 py-1 rounded hover:bg-orange-50"
						>View</a>
						{#if anomaly.status === 'active'}
							<button
								type="button"
								class="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
								disabled={dismissingId === anomaly.id}
								onclick={() => dismiss(anomaly.id)}
							>{dismissingId === anomaly.id ? 'Dismissing…' : 'Dismiss'}</button>
						{/if}
					</div>
				</div>

				<!-- Expanded detail -->
				{#if selected === anomaly.id && attribution.length > 0}
					<div id={`anomaly-detail-${anomaly.id}`} class="px-6 pb-5 pt-2 border-t border-gray-50">
						<p class="text-xs font-medium text-gray-500 mb-3">Spike Contributors</p>
						<div class="space-y-2">
							{#each attribution as contrib}
								<div class="flex items-center gap-3">
									<span class="text-xs text-slate-700 w-44 shrink-0">{contrib.label ?? contrib.type ?? ''}</span>
									<div class="flex-1 h-2 rounded-full bg-gray-100">
										<div class="h-2 rounded-full bg-orange-400" style="width: {contrib.contributionPct ?? 0}%"></div>
									</div>
									<span class="text-xs font-semibold text-slate-900 w-8 text-right">{contrib.contributionPct ?? 0}%</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}
