<script lang="ts">
import { goto } from '$app/navigation';
import { presentAnomaly } from '$lib/anomaly-presentation.js';
import type { PageData } from './$types.js';

let { data }: { data: PageData } = $props();

const anomaly = $derived(data.anomaly);
const presented = $derived(anomaly ? presentAnomaly(anomaly) : null);

const severityBadge: Record<'critical' | 'high' | 'warning' | 'info', string> = {
	critical: 'bg-red-100 text-red-700 border border-red-200',
	high: 'bg-orange-100 text-orange-700 border border-orange-200',
	warning: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
	info: 'bg-blue-100 text-blue-700 border border-blue-200',
};

function formatDate(iso: string): string {
	return new Date(iso).toLocaleString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

let dismissing = $state(false);

async function dismiss() {
	if (!anomaly) return;
	dismissing = true;
	try {
		await fetch(`/api/anomalies/${anomaly.id}/dismiss`, {
			method: 'PATCH',
			credentials: 'include',
		});
		await goto('/anomalies');
	} catch {
		dismissing = false;
	}
}
</script>

<div class="mb-6">
	<a href="/anomalies" class="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-600 mb-4">
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
		</svg>
		Back to Anomalies
	</a>
	<h1 class="text-2xl font-bold text-slate-900">Anomaly Detail</h1>
</div>

{#if !anomaly}
	<div class="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-12 text-center">
		<p class="text-gray-400 text-sm">Anomaly not found.</p>
		<a href="/anomalies" class="mt-4 inline-block text-sm text-orange-600 hover:underline">Return to anomalies list</a>
	</div>
{:else}
	<!-- Info card -->
	<div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-4">
		<div class="flex items-start justify-between gap-4 mb-6">
			<div>
				<div class="flex items-center gap-2 mb-1">
					<h2 class="text-lg font-semibold text-slate-900">{presented?.headline}</h2>
					<span class="text-sm font-medium px-2.5 py-0.5 rounded-full {severityBadge[anomaly.severity]}">{anomaly.severity}</span>
				</div>
				{#if presented}
					<p class="text-sm text-gray-500">{presented.summary}</p>
				{/if}
			</div>
			<span class="text-sm text-gray-400 whitespace-nowrap">Detected {formatDate(anomaly.detected_at)}</span>
		</div>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<div class="bg-slate-50 rounded-lg p-4">
				<p class="text-xs font-medium text-gray-500 mb-1">Why this matters</p>
				<p class="text-sm text-slate-700">{presented?.impact}</p>
			</div>
			<div class="bg-slate-50 rounded-lg p-4">
				<p class="text-xs font-medium text-gray-500 mb-1">What to check next</p>
				<ul class="space-y-1 text-sm text-slate-700">
					{#each presented?.nextChecks ?? [] as item}
						<li>{item}</li>
					{/each}
				</ul>
			</div>
		</div>
	</div>

	<!-- Attribution breakdown -->
	{#if anomaly.attribution.length > 0}
		<div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-4">
			<h3 class="text-sm font-semibold text-slate-900 mb-4">Likely contributors</h3>
			<div class="space-y-3">
				{#each presented?.presentedAttribution ?? [] as contrib}
					<div class="flex items-center gap-3">
						<span class="text-sm text-slate-500 w-28 shrink-0">{contrib.label}</span>
						<span class="text-sm text-slate-700 w-48 shrink-0 truncate">{contrib.value}</span>
						<div class="flex-1 h-3 rounded-full bg-gray-100">
							<div class="h-3 rounded-full bg-orange-400 transition-all" style="width: {contrib.contributionPct}%"></div>
						</div>
						<span class="text-sm font-semibold text-slate-900 w-12 text-right">{contrib.contributionPct}%</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-4">
		<h3 class="text-sm font-semibold text-slate-900 mb-4">Technical details</h3>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			<div class="bg-slate-50 rounded-lg p-4">
				<p class="text-xs font-medium text-gray-500 mb-1">Resource</p>
				<p class="text-sm font-semibold text-slate-700">{anomaly.resource_name ?? anomaly.resource_id ?? '—'}</p>
			</div>
			<div class="bg-slate-50 rounded-lg p-4">
				<p class="text-xs font-medium text-gray-500 mb-1">Metric</p>
				<p class="text-sm font-semibold text-slate-700">{anomaly.metric}</p>
			</div>
			<div class="bg-slate-50 rounded-lg p-4">
				<p class="text-xs font-medium text-gray-500 mb-1">Detection method</p>
				<p class="text-sm font-semibold text-slate-700">{anomaly.detection_type}</p>
			</div>
			<div class="bg-slate-50 rounded-lg p-4">
				<p class="text-xs font-medium text-gray-500 mb-1">Current value</p>
				<p class="text-sm font-semibold text-slate-700">{anomaly.current_value.toLocaleString()}</p>
			</div>
			<div class="bg-slate-50 rounded-lg p-4">
				<p class="text-xs font-medium text-gray-500 mb-1">Baseline value</p>
				<p class="text-sm font-semibold text-slate-700">{anomaly.baseline_value?.toLocaleString() ?? '—'}</p>
			</div>
			<div class="bg-slate-50 rounded-lg p-4">
				<p class="text-xs font-medium text-gray-500 mb-1">Deviation</p>
				<p class="text-sm font-semibold text-slate-700">{anomaly.deviation != null ? anomaly.deviation.toFixed(2) : '—'}</p>
			</div>
		</div>
	</div>

	<!-- Actions -->
	{#if anomaly.status === 'active'}
		<div class="flex items-center gap-3">
			<button
				onclick={dismiss}
				disabled={dismissing}
				class="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{dismissing ? 'Dismissing…' : 'Dismiss Anomaly'}
			</button>
		</div>
	{:else}
		<div class="text-sm text-gray-400 italic">
			Status: <span class="font-medium text-slate-600">{anomaly.status}</span>
			{#if anomaly.dismissed_by}— dismissed by {anomaly.dismissed_by}{/if}
		</div>
	{/if}
{/if}
