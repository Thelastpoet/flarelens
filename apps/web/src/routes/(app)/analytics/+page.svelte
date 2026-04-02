<script lang="ts">
	import TrafficChart from '$lib/components/charts/TrafficChart.svelte';
	import GeoTraffic from '$lib/components/dashboard/GeoTraffic.svelte';
	import TopEndpoints from '$lib/components/dashboard/TopEndpoints.svelte';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	let activeTab = $state<'Traffic' | 'Performance' | 'Errors'>('Traffic');

	const tabs = ['Traffic', 'Performance', 'Errors'] as const;
	const isUnavailable = $derived(data.state === 'unavailable');
	const trafficData = $derived(data.state === 'ready' ? data.traffic : null);
	const endpoints = $derived(data.state === 'ready' ? data.endpoints.endpoints : []);
	const countries = $derived(data.state === 'ready' ? data.geo.countries : []);
	const clients = $derived(data.state === 'ready' ? data.clients.clients : []);
	const performanceData = $derived(data.state === 'ready' ? data.performance : null);
	const errorsData = $derived(data.state === 'ready' ? data.errors : null);
	const trafficPoints = $derived(data.state === 'ready' ? data.traffic.points : []);
	const errors = $derived(data.state === 'ready' ? data.errors.errors : []);
	const totalRequests = $derived(data.state === 'ready' ? data.traffic.totalRequests : 0);
	const totalCachedRequests = $derived(data.state === 'ready' ? data.traffic.totalCachedRequests : 0);
	const cacheHitRate = $derived(totalRequests > 0 ? (totalCachedRequests / totalRequests) * 100 : 0);
	const liveWindow = $derived(
		data.state === 'ready'
			? `${new Date(data.traffic.from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(data.traffic.to).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
			: '',
	);

function formatCompact(n: number): string {
	return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(n);
}

function formatPct(n: number): string {
	return `${n.toFixed(1)}%`;
}

function formatMs(n: number): string {
	if (n <= 0) return 'Unavailable';
	return `${n.toFixed(1)} ms`;
}

function formatErrorStatus(status: number): string {
	return `${status}`;
}
</script>

{#if isUnavailable}
	<div class="max-w-[1200px] mx-auto">
			<div class="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
				<h1 class="text-2xl font-bold text-slate-900">Analytics temporarily unavailable</h1>
				<p class="mt-3 text-sm text-slate-500">{data.message}</p>
				<p class="mt-2 text-sm text-slate-400">
					Reconnect the Cloudflare account from <a class="text-primary hover:underline font-medium" href="/settings/cloudflare">Settings → Cloudflare</a>, or try again after analytics data becomes available.
				</p>
			</div>
		</div>
	{:else if trafficData && performanceData && errorsData}
<div class="max-w-[1200px] mx-auto flex flex-col gap-6">
	<!-- Page header -->
	<div class="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 pb-2">
		<div class="flex flex-col gap-1.5">
			<h1 class="text-slate-900 text-2xl font-bold leading-tight">Analytics Overview</h1>
			<p class="text-slate-500 text-sm font-normal">Monitor your infrastructure usage and prevent unexpected costs.</p>
		</div>
		<div class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
			{liveWindow}
		</div>
	</div>

	<!-- Tab bar -->
	<div role="tablist" aria-label="Analytics sections" class="bg-white rounded-lg border border-slate-200 shadow-sm p-1 inline-flex self-start">
		{#each tabs as tab}
			<button
				type="button"
				role="tab"
				aria-selected={activeTab === tab}
				onclick={() => (activeTab = tab)}
				class="flex items-center justify-center rounded-md px-5 py-1.5 transition-colors {activeTab === tab
					? 'bg-slate-100 text-slate-900'
					: 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}"
			>
				<p class="text-sm {activeTab === tab ? 'font-semibold' : 'font-medium'}">{tab}</p>
			</button>
		{/each}
	</div>

	<div class="flex flex-col gap-6">
		{#if activeTab === 'Traffic'}
			<div class="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
				<div class="flex justify-between items-start gap-6">
					<div>
						<h3 class="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-1">Requests by Type</h3>
						<div class="flex items-baseline gap-3">
							<p class="text-slate-900 text-3xl font-bold tracking-tight">
								{formatCompact(totalRequests)}
							</p>
							<p class="text-slate-600 text-sm font-medium bg-slate-100 px-2 py-0.5 rounded-md">
								Cache hit {formatPct(cacheHitRate)}
							</p>
						</div>
					</div>
					<div class="flex items-center gap-4 text-sm border border-slate-100 rounded-lg px-3 py-1.5 bg-white shadow-sm">
						<div class="flex items-center gap-2 text-slate-600 font-medium">
							<div class="size-2.5 rounded-sm bg-primary"></div>
							<span>Actual</span>
						</div>
						<div class="flex items-center gap-2 text-slate-600 font-medium">
							<div class="size-2.5 rounded-sm bg-slate-300"></div>
							<span>Cached</span>
						</div>
					</div>
				</div>

				<div class="flex min-h-[280px] flex-1 flex-col justify-end relative mt-8">
					{#if trafficPoints.length > 0}
						<TrafficChart points={trafficPoints} height={220} />
					{:else}
						<div class="flex min-h-[220px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
							No traffic points are available for the current analytics window.
						</div>
					{/if}
				</div>
			</div>

			<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div class="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm col-span-1">
					<h4 class="text-slate-900 text-sm font-semibold mb-6 flex items-center gap-2">
						<span class="material-symbols-outlined text-slate-400 text-lg">list_alt</span> Top Endpoints
					</h4>
					<TopEndpoints {endpoints} />
				</div>

				<div class="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm col-span-1">
					<h4 class="text-slate-900 text-sm font-semibold mb-6 flex items-center gap-2">
						<span class="material-symbols-outlined text-slate-400 text-lg">public</span> Traffic by Country
					</h4>
					<GeoTraffic {countries} />
				</div>

				<div class="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm col-span-1">
					<h4 class="text-slate-900 text-sm font-semibold mb-6 flex items-center gap-2">
						<span class="material-symbols-outlined text-slate-400 text-lg">devices</span> Client Distribution
					</h4>
					{#if clients.length > 0}
						<div class="flex flex-col gap-4">
							{#each clients.slice(0, 6) as client}
								<div class="flex flex-col gap-1">
									<div class="flex items-center justify-between text-sm">
										<span class="font-medium text-slate-700">{client.browser}</span>
										<div class="flex items-center gap-2 text-xs text-slate-500">
											<span class="font-medium text-slate-900">{formatCompact(client.requests)}</span>
											<span>{formatPct(client.percentage * 100)}</span>
										</div>
									</div>
									<div class="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
										<div class="h-full rounded-full bg-primary" style={`width: ${Math.min(100, client.percentage * 100).toFixed(1)}%`}></div>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="flex min-h-[150px] items-center justify-center text-sm text-slate-500">
							No client distribution data is available for the current window.
						</div>
					{/if}
				</div>
			</div>
		{:else if activeTab === 'Performance'}
			<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
				<div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
					<p class="text-sm font-medium text-slate-500">Average Response Time</p>
					<p class="mt-3 text-3xl font-bold text-slate-900">{formatMs(performanceData.avgResponseMs)}</p>
					<p class="mt-2 text-xs text-slate-500">Unavailable when Cloudflare latency percentiles are not exposed by the current dataset.</p>
				</div>
				<div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
					<p class="text-sm font-medium text-slate-500">P95 Response Time</p>
					<p class="mt-3 text-3xl font-bold text-slate-900">{formatMs(performanceData.p95ResponseMs)}</p>
					<p class="mt-2 text-xs text-slate-500">Current backend only reports this when the analytics dataset exposes percentile latency.</p>
				</div>
				<div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
					<p class="text-sm font-medium text-slate-500">Worker Avg CPU</p>
					<p class="mt-3 text-3xl font-bold text-slate-900">{formatMs(performanceData.workerAvgCpuMs)}</p>
					<p class="mt-2 text-xs text-slate-500">Average Worker CPU time across the current live window.</p>
				</div>
				<div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
					<p class="text-sm font-medium text-slate-500">Request Error Rate</p>
					<p class="mt-3 text-3xl font-bold text-slate-900">{formatPct(performanceData.errorRate * 100)}</p>
					<p class="mt-2 text-xs text-slate-500">Aggregate HTTP error responses across monitored zones.</p>
				</div>
				<div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
					<p class="text-sm font-medium text-slate-500">Worker Error Rate</p>
					<p class="mt-3 text-3xl font-bold text-slate-900">{formatPct(performanceData.workerErrorRate * 100)}</p>
					<p class="mt-2 text-xs text-slate-500">Worker execution errors relative to live Worker requests.</p>
				</div>
				<div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
					<p class="text-sm font-medium text-slate-500">Threats Blocked</p>
					<p class="mt-3 text-3xl font-bold text-slate-900">{formatCompact(performanceData.threatsBlocked)}</p>
					<p class="mt-2 text-xs text-slate-500">Threat traffic observed in the current live window.</p>
				</div>
			</div>
		{:else}
			<div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
				<div class="flex items-center justify-between gap-4">
					<div>
						<h3 class="text-lg font-semibold text-slate-900">HTTP Error Breakdown</h3>
						<p class="mt-1 text-sm text-slate-500">Live HTTP error responses by status code for the current analytics window.</p>
					</div>
					<div class="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
						{formatCompact(errorsData.totalErrors)} total errors
					</div>
				</div>

				{#if errors.length > 0}
					<div class="mt-6 flex flex-col gap-4">
						{#each errors as error}
							<div class="flex flex-col gap-1">
								<div class="flex items-center justify-between text-sm">
									<span class="font-medium text-slate-700">HTTP {formatErrorStatus(error.status)}</span>
									<div class="flex items-center gap-2 text-xs text-slate-500">
										<span class="font-medium text-slate-900">{formatCompact(error.requests)}</span>
										<span>{formatPct(error.percentage * 100)}</span>
									</div>
								</div>
								<div class="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
									<div class="h-full rounded-full bg-amber-500" style={`width: ${Math.min(100, error.percentage * 100).toFixed(1)}%`}></div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="mt-6 flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
						No HTTP error breakdown is available for the current window.
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
{/if}
