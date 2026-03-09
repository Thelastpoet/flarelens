<script lang="ts">
const anomalies = [
	{
		id: '1',
		resource: 'example.com',
		type: 'Zone',
		detection: 'velocity',
		severity: 'critical' as const,
		metric: 'requests',
		current: '48,000/min',
		baseline: '12,000/min',
		deviation: '+300%',
		status: 'active' as const,
		detectedAt: '15 mins ago',
		attribution: [
			{ label: 'GPTBot', pct: 41 },
			{ label: '/api/image-resize', pct: 32 },
			{ label: 'Brazil traffic', pct: 18 },
		],
	},
	{
		id: '2',
		resource: 'api-gateway',
		type: 'Worker',
		detection: 'threshold',
		severity: 'high' as const,
		metric: 'cost',
		current: '$8.40/hr',
		baseline: '$1.20/hr',
		deviation: '+600%',
		status: 'active' as const,
		detectedAt: '1 hour ago',
		attribution: [
			{ label: '/v1/process', pct: 62 },
			{ label: 'US East', pct: 28 },
		],
	},
	{
		id: '3',
		resource: 'session-store',
		type: 'KV',
		detection: 'baseline',
		severity: 'warning' as const,
		metric: 'reads',
		current: '9,800/min',
		baseline: '4,200/min',
		deviation: '+133%',
		status: 'active' as const,
		detectedAt: '3 hours ago',
		attribution: [],
	},
	{
		id: '4',
		resource: 'example.com',
		type: 'Zone',
		detection: 'threshold',
		severity: 'warning' as const,
		metric: 'errors',
		current: '2.8%',
		baseline: '0.3%',
		deviation: '+833%',
		status: 'dismissed' as const,
		detectedAt: '1 day ago',
		attribution: [],
	},
];

const severityBadge: Record<string, string> = {
	critical: 'bg-red-100 text-red-700',
	high: 'bg-orange-100 text-orange-700',
	warning: 'bg-yellow-100 text-yellow-700',
};

const severityDot: Record<string, string> = {
	critical: 'bg-red-500',
	high: 'bg-orange-500',
	warning: 'bg-yellow-400',
};

let filter = $state('active');
let selected = $state<string | null>(null);

const filtered = $derived(
	filter === 'all' ? anomalies : anomalies.filter((a) => a.status === filter),
);

const detail = $derived(anomalies.find((a) => a.id === selected) || null);
</script>

<div class="flex items-center justify-between mb-6">
	<div>
		<h1 class="text-2xl font-bold text-slate-900">Anomalies</h1>
		<p class="text-sm text-gray-500 mt-0.5">Detected traffic and cost anomalies across your infrastructure.</p>
	</div>
	<div class="flex items-center gap-2">
		<button onclick={() => filter = 'active'} class="px-3 py-1.5 text-sm rounded-lg {filter === 'active' ? 'bg-orange-500 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}">Active</button>
		<button onclick={() => filter = 'dismissed'} class="px-3 py-1.5 text-sm rounded-lg {filter === 'dismissed' ? 'bg-orange-500 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}">Dismissed</button>
		<button onclick={() => filter = 'all'} class="px-3 py-1.5 text-sm rounded-lg {filter === 'all' ? 'bg-orange-500 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}">All</button>
	</div>
</div>

<div class="space-y-3">
	{#each filtered as anomaly}
		<div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
			<div class="flex">
				<div class="w-1 {severityDot[anomaly.severity]} shrink-0"></div>
				<button
					class="flex-1 px-5 py-4 text-left hover:bg-gray-50/50 w-full"
					onclick={() => selected = selected === anomaly.id ? null : anomaly.id}
				>
					<div class="flex items-start justify-between gap-4">
						<div class="flex items-start gap-3">
							<div>
								<div class="flex items-center gap-2 mb-1">
									<span class="text-sm font-semibold text-slate-900">{anomaly.resource}</span>
									<span class="text-xs text-gray-400">{anomaly.type}</span>
									<span class="text-xs font-medium px-2 py-0.5 rounded-full {severityBadge[anomaly.severity]}">{anomaly.severity}</span>
									{#if anomaly.status === 'dismissed'}
										<span class="text-xs text-gray-400 italic">dismissed</span>
									{/if}
								</div>
								<div class="text-sm text-gray-600">
									{anomaly.metric} spiked to <span class="font-semibold text-red-600">{anomaly.current}</span>
									(baseline: {anomaly.baseline} · <span class="text-red-500 font-medium">{anomaly.deviation}</span>)
								</div>
								{#if anomaly.attribution.length > 0}
									<div class="text-xs text-gray-400 mt-1">
										Top contributors: {anomaly.attribution.map(a => `${a.label} (${a.pct}%)`).join(' · ')}
									</div>
								{/if}
							</div>
						</div>
						<div class="text-xs text-gray-400 whitespace-nowrap shrink-0">{anomaly.detectedAt}</div>
					</div>
				</button>
				{#if anomaly.status === 'active'}
					<div class="flex items-center pr-4">
						<button class="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100">Dismiss</button>
					</div>
				{/if}
			</div>

			<!-- Expanded detail -->
			{#if selected === anomaly.id && anomaly.attribution.length > 0}
				<div class="px-6 pb-5 pt-2 border-t border-gray-50">
					<p class="text-xs font-medium text-gray-500 mb-3">Spike Contributors</p>
					<div class="space-y-2">
						{#each anomaly.attribution as contrib}
							<div class="flex items-center gap-3">
								<span class="text-xs text-slate-700 w-44 shrink-0">{contrib.label}</span>
								<div class="flex-1 h-2 rounded-full bg-gray-100">
									<div class="h-2 rounded-full bg-orange-400" style="width: {contrib.pct}%"></div>
								</div>
								<span class="text-xs font-semibold text-slate-900 w-8 text-right">{contrib.pct}%</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/each}
</div>
