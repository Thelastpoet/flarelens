<script lang="ts">
import TrafficChart from '$lib/components/charts/TrafficChart.svelte';
import BotActivity from '$lib/components/dashboard/BotActivity.svelte';
import TopEndpoints from '$lib/components/dashboard/TopEndpoints.svelte';
import type { PageData } from './$types.js';

let { data }: { data: PageData } = $props();

interface OverviewData {
	totalRequests: number;
	cachedRequests: number;
	cacheHitRate: number;
	totalBytes: number;
	estimatedCost: number;
	activeAnomalies: number;
	workerExecutions: number;
	threatsBlocked: number;
	periodFrom: string;
	periodTo: string;
}

interface TrafficData {
	points: Array<{
		datetime: string;
		requests: number;
		cachedRequests: number;
		uncachedRequests: number;
		bytes: number;
	}>;
	totalRequests: number;
	totalCachedRequests: number;
	totalBytes: number;
	from: string;
	to: string;
}

interface TopEndpointItem {
	path: string;
	requests: number;
	bytes: number;
	pctOfTotal: number;
}

interface BotActivityData {
	items: Array<{
		userAgent: string;
		requests: number;
		pctOfTotal: number;
		isBot: boolean;
	}>;
	botTrafficPct: number;
}

const overview = $derived(data.overview as OverviewData | null);
const traffic = $derived(data.traffic as TrafficData | null);
const endpointsData = $derived(data.endpoints as { endpoints: TopEndpointItem[] } | null);
const botData = $derived(data.botActivity as BotActivityData | null);

const trafficPoints = $derived(traffic?.points ?? []);
const endpoints = $derived(endpointsData?.endpoints ?? []);
const bots = $derived(botData?.items ?? []);
const botTrafficPct = $derived(botData?.botTrafficPct ?? 0);

function formatCompact(n: number): string {
	return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(n);
}

function formatCost(n: number): string {
	return `$${n.toFixed(2)}`;
}
</script>

<!-- Header row -->
<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
	<div class="flex flex-col gap-1">
		<h1 class="text-slate-900 text-2xl sm:text-[28px] font-bold leading-tight">Dashboard Overview</h1>
		<div class="flex items-center gap-2">
			<div class="size-2 rounded-full bg-emerald-500"></div>
			<p class="text-slate-500 text-sm font-medium leading-normal">All Systems Normal</p>
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
				{formatCompact(overview?.totalRequests ?? 0)}
			</p>
			<div class="flex items-center text-emerald-600 text-sm font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">
				<span class="material-symbols-outlined !text-[16px]">trending_up</span>
				<span>5%</span>
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
				{formatCompact(overview?.workerExecutions ?? 0)}
			</p>
			<div class="flex items-center text-emerald-600 text-sm font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">
				<span class="material-symbols-outlined !text-[16px]">trending_up</span>
				<span>12%</span>
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
				{formatCost(overview?.estimatedCost ?? 0)}
			</p>
			<div class="flex items-center text-emerald-600 text-sm font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">
				<span class="material-symbols-outlined !text-[16px]">trending_down</span>
				<span>2%</span>
			</div>
		</div>
		<div class="w-full bg-slate-100 rounded-full h-1.5 mt-2">
			<div class="bg-primary h-1.5 rounded-full" style="width: 25%"></div>
		</div>
		<p class="text-xs text-slate-500 mt-1">25% of $50 limit</p>
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
			<div class="flex flex-col gap-4">
				{#each [
					{ dot: 'bg-amber-500',  title: 'Rate limit triggered',      sub: 'API endpoint /v1/users experienced a surge.',  time: '10 mins ago' },
					{ dot: 'bg-emerald-500', title: 'Cost optimization applied', sub: 'Automatically cached 45 static assets.',         time: '2 hours ago' },
					{ dot: 'bg-slate-300',  title: 'Worker script deployed',     sub: 'Auth-middleware v2.1 successfully deployed.',   time: '5 hours ago' },
				] as item}
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
