<script lang="ts">
import TrafficChart from '$lib/components/charts/TrafficChart.svelte';
import BotActivity from '$lib/components/dashboard/BotActivity.svelte';
import TopEndpoints from '$lib/components/dashboard/TopEndpoints.svelte';
import type { PageData } from './$types.js';

let { data }: { data: PageData } = $props();
const isUnavailable = $derived(data.state === 'unavailable');
const overview = $derived(data.state === 'ready' ? data.overview : null);
const traffic = $derived(data.state === 'ready' ? data.traffic : null);
const baseline = $derived(data.state === 'ready' ? data.baseline.comparisons : []);
const endpoints = $derived(data.state === 'ready' ? data.endpoints.endpoints : []);
const bots = $derived(data.state === 'ready' ? data.botActivity.items : []);
const botTrafficPct = $derived(data.state === 'ready' ? data.botActivity.botTrafficPct : 0);
const trafficPoints = $derived(data.state === 'ready' ? data.traffic.points : []);

function formatCompact(n: number): string {
	return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(n);
}

function formatCost(n: number): string {
	return `$${n.toFixed(2)}`;
}

function formatPeriodLabel(from: string, to: string): string {
	const fromDate = new Date(from);
	const toDate = new Date(to);

	const sameDay = fromDate.toDateString() === toDate.toDateString();
	if (sameDay) {
		return `${fromDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${fromDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${toDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
	}

	return `${fromDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${toDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

const periodLabel = $derived(
	data.state === 'ready' ? formatPeriodLabel(data.overview.periodFrom, data.overview.periodTo) : '',
);

const headlineStatus = $derived.by(() => {
	if (data.state !== 'ready') {
		return {
			label: 'Dashboard unavailable',
			dot: 'bg-slate-400',
			text: 'text-slate-500',
		};
	}

	const currentOverview = data.overview;
	if (currentOverview.activeAnomalies > 0 || currentOverview.threatsBlocked > 0) {
		return {
			label: `${currentOverview.activeAnomalies} active anomaly${currentOverview.activeAnomalies === 1 ? '' : 'ies'}`,
			dot: 'bg-amber-500',
			text: 'text-amber-600',
		};
	}
	return {
		label: 'No active anomalies',
		dot: 'bg-emerald-500',
		text: 'text-slate-500',
	};
});

function deviationFor(metric: string): number | null {
	const match = baseline.find((item) => item.metric === metric);
	return match ? match.deviationSigma : null;
}

function trendTone(metric: string): 'positive' | 'caution' | 'neutral' {
	const deviation = deviationFor(metric);
	if (deviation == null) return 'neutral';
	return deviation >= 2 ? 'caution' : 'positive';
}

function trendLabel(metric: string): string {
	const deviation = deviationFor(metric);
	if (deviation == null) return 'No baseline';
	return `${deviation.toFixed(1)}σ`;
}

function trendClasses(metric: string): string {
	const tone = trendTone(metric);
	if (tone === 'caution') return 'text-amber-700 bg-amber-50';
	if (tone === 'positive') return 'text-emerald-600 bg-emerald-50';
	return 'text-slate-500 bg-slate-100';
}

function trendIcon(metric: string): string {
	const tone = trendTone(metric);
	if (tone === 'caution') return 'trending_up';
	if (tone === 'positive') return 'check';
	return 'remove';
}

const estimatedBudgetPct = $derived(() => {
	if (data.state !== 'ready' || data.overview.estimatedCost <= 0) return 0;
	return Math.min(100, Math.max(5, data.overview.estimatedCost * 10));
});

const recentActivity = $derived.by(() => {
	const items: Array<{ dot: string; title: string; sub: string; time: string }> = [];
	if (data.state !== 'ready') {
		return items;
	}

	if (data.overview.activeAnomalies > 0) {
		items.push({
			dot: 'bg-amber-500',
			title: 'Active anomalies detected',
			sub: `${data.overview.activeAnomalies} anomaly${data.overview.activeAnomalies === 1 ? '' : 'ies'} currently require review.`,
			time: periodLabel,
		});
	}

	if (data.overview.threatsBlocked > 0) {
		items.push({
			dot: 'bg-emerald-500',
			title: 'Threat traffic blocked',
			sub: `${formatCompact(data.overview.threatsBlocked)} requests were flagged or blocked in the current window.`,
			time: periodLabel,
		});
	}

	if (data.overview.workerExecutions > 0) {
		items.push({
			dot: 'bg-slate-300',
			title: 'Worker activity observed',
			sub: `${formatCompact(data.overview.workerExecutions)} worker executions recorded in the current analytics window.`,
			time: periodLabel,
		});
	}

	return items.slice(0, 3);
});
</script>

{#if isUnavailable}
	<div class="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
		<h1 class="text-2xl font-bold text-slate-900">Dashboard temporarily unavailable</h1>
		<p class="mt-3 text-sm text-slate-500">{data.message}</p>
		<p class="mt-2 text-sm text-slate-400">Reconnect the Cloudflare account or try again after analytics data becomes available.</p>
	</div>
{:else if overview && traffic}
<!-- Header row -->
<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
	<div class="flex flex-col gap-1">
		<h1 class="text-slate-900 text-2xl sm:text-[28px] font-bold leading-tight">Dashboard Overview</h1>
		<div class="flex items-center gap-2">
			<div class="size-2 rounded-full {headlineStatus.dot}"></div>
			<p class="{headlineStatus.text} text-sm font-medium leading-normal">{headlineStatus.label}</p>
		</div>
	</div>
	<div class="flex items-center gap-3">
		<select class="bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:ring-primary focus:border-primary py-2 pl-3 pr-10 shadow-sm">
			<option>Last 24 Hours</option>
			<option>Last 7 Days</option>
			<option>Last 30 Days</option>
		</select>
		<button class="p-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
			<span class="material-symbols-outlined !text-[20px]">refresh</span>
		</button>
	</div>
</div>

<!-- Stat cards -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
	<!-- Total Requests -->
	<div class="flex flex-col gap-3 rounded-xl p-5 border border-slate-200 bg-white shadow-sm">
		<div class="flex justify-between items-start">
			<p class="text-slate-500 text-sm font-medium leading-normal">Total Requests</p>
			<span class="material-symbols-outlined text-slate-400 !text-[20px]">public</span>
		</div>
		<div class="flex items-baseline gap-3">
			<p class="text-slate-900 text-3xl font-bold leading-tight tracking-tight">
				{formatCompact(overview.totalRequests)}
			</p>
			<div class="flex items-center text-sm font-semibold px-2 py-0.5 rounded-md {trendClasses('requests')}">
				<span class="material-symbols-outlined !text-[16px]">{trendIcon('requests')}</span>
				<span>{trendLabel('requests')}</span>
			</div>
		</div>
	</div>

	<!-- Worker Executions -->
	<div class="flex flex-col gap-3 rounded-xl p-5 border border-slate-200 bg-white shadow-sm">
		<div class="flex justify-between items-start">
			<p class="text-slate-500 text-sm font-medium leading-normal">Worker Executions</p>
			<span class="material-symbols-outlined text-slate-400 !text-[20px]">memory</span>
		</div>
		<div class="flex items-baseline gap-3">
			<p class="text-slate-900 text-3xl font-bold leading-tight tracking-tight">
				{formatCompact(overview.workerExecutions)}
			</p>
			<div class="flex items-center text-sm font-semibold px-2 py-0.5 rounded-md {trendClasses('requests')}">
				<span class="material-symbols-outlined !text-[16px]">{trendIcon('requests')}</span>
				<span>{trendLabel('requests')}</span>
			</div>
		</div>
	</div>

	<!-- Estimated Cost -->
	<div class="flex flex-col gap-3 rounded-xl p-5 border border-slate-200 bg-white shadow-sm">
		<div class="flex justify-between items-start">
			<p class="text-slate-500 text-sm font-medium leading-normal">Estimated Cost</p>
			<span class="material-symbols-outlined text-primary !text-[20px]">account_balance_wallet</span>
		</div>
		<div class="flex items-baseline gap-3">
			<p class="text-slate-900 text-3xl font-bold leading-tight tracking-tight">
				{formatCost(overview.estimatedCost)}
			</p>
			<div class="flex items-center text-sm font-semibold px-2 py-0.5 rounded-md {trendClasses('bytes')}">
				<span class="material-symbols-outlined !text-[16px]">{trendIcon('bytes')}</span>
				<span>{trendLabel('bytes')}</span>
			</div>
		</div>
		<div class="w-full bg-slate-100 rounded-full h-1.5 mt-2">
			<div class="bg-primary h-1.5 rounded-full" style="width: {estimatedBudgetPct}%"></div>
		</div>
		<p class="text-xs text-slate-500 mt-1">Estimate for {periodLabel}</p>
	</div>
</div>

<!-- Chart + Quick Stats -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
	<!-- Traffic vs Baseline chart -->
	<div class="lg:col-span-2 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
		<div class="flex justify-between items-center mb-2">
			<div>
				<h3 class="text-slate-900 text-lg font-semibold leading-normal">Traffic vs. Baseline</h3>
				<p class="text-slate-500 text-sm font-normal">Real-time usage against predicted norm</p>
			</div>
			<div class="flex items-center gap-4 text-xs font-medium">
				<div class="flex items-center gap-1.5">
					<div class="w-3 h-3 rounded-sm bg-primary"></div>
					<span class="text-slate-600">Actual</span>
				</div>
				<div class="flex items-center gap-1.5">
					<div class="w-3 h-3 rounded-sm bg-slate-200 border border-dashed border-slate-400"></div>
					<span class="text-slate-600">Cached</span>
				</div>
			</div>
		</div>

		<div class="flex min-h-[280px] flex-1 flex-col gap-6 py-4">
			<TrafficChart points={trafficPoints} height={240} />
		</div>
	</div>

	<!-- Right column: Quick Stats + Recent Activity -->
	<div class="flex flex-col gap-6">
		<!-- Quick Stats / Bot Activity -->
		<div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
			<h3 class="text-slate-900 text-base font-semibold leading-normal mb-4">Quick Stats</h3>
			<BotActivity {bots} {botTrafficPct} />
		</div>

		<!-- Recent Activity -->
		<div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex-1">
			<div class="flex justify-between items-center mb-4">
				<h3 class="text-slate-900 text-base font-semibold leading-normal">Recent Activity</h3>
				<a href="/notifications" class="text-xs font-medium text-primary hover:underline">View All</a>
			</div>
			{#if recentActivity.length > 0}
				<div class="flex flex-col gap-4">
					{#each recentActivity as item}
						<div class="flex gap-3">
							<div class="mt-1.5 size-2 rounded-full {item.dot} shrink-0"></div>
							<div class="flex flex-col gap-0.5">
								<p class="text-sm font-medium text-slate-900">{item.title}</p>
								<p class="text-xs text-slate-500">{item.sub}</p>
								<p class="text-[10px] text-slate-400 mt-1">{item.time}</p>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-xs text-slate-400">No recent live activity is available for this account yet.</p>
			{/if}
		</div>
	</div>
</div>

<!-- Top Endpoints section -->
{#if endpoints.length > 0}
	<div class="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
		<h3 class="text-slate-900 text-base font-semibold leading-normal mb-4 flex items-center gap-2">
			<span class="material-symbols-outlined text-slate-400 text-lg">list_alt</span>
			Top Endpoints
		</h3>
		<TopEndpoints {endpoints} />
	</div>
{/if}
{/if}
