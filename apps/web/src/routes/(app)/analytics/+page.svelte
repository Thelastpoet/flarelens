<script lang="ts">
import TrafficChart from '$lib/components/charts/TrafficChart.svelte';
import GeoTraffic from '$lib/components/dashboard/GeoTraffic.svelte';
import TopEndpoints from '$lib/components/dashboard/TopEndpoints.svelte';
import type { PageData } from './$types.js';

let { data }: { data: PageData } = $props();

let timeRange = $state('Last 7 Days');
let activeTab = $state('Traffic');

const tabs = ['Traffic', 'Performance', 'Security'];

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

interface GeoItem {
	country: string;
	requests: number;
	pctOfTotal: number;
}

interface GeoData {
	countries: GeoItem[];
}

const trafficData = $derived(data.traffic as TrafficData | null);
const endpointsData = $derived(data.endpoints as { endpoints: TopEndpointItem[] } | null);
const geoData = $derived(data.geo as GeoData | null);

const trafficPoints = $derived(trafficData?.points ?? []);
const endpoints = $derived(endpointsData?.endpoints ?? []);
const countries = $derived(geoData?.countries ?? []);

const totalRequests = $derived(trafficData?.totalRequests ?? 0);

function formatCompact(n: number): string {
	return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(n);
}

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
</script>

<div class="max-w-[1200px] mx-auto flex flex-col gap-6">
	<!-- Page header -->
	<div class="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 pb-2">
		<div class="flex flex-col gap-1.5">
			<h1 class="text-slate-900 text-2xl font-bold leading-tight">Analytics Overview</h1>
			<p class="text-slate-500 text-sm font-normal">Monitor your infrastructure usage and prevent unexpected costs.</p>
		</div>
		<div class="flex items-center gap-3">
			<select
				bind:value={timeRange}
				class="form-select rounded-lg border-slate-200 bg-white text-slate-900 text-sm focus:ring-primary focus:border-primary py-2 px-3 shadow-sm font-medium"
			>
				<option>Last 7 Days</option>
				<option>Last 30 Days</option>
				<option>This Month</option>
			</select>
			<button class="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors">
				<span class="material-symbols-outlined text-sm">download</span>
				Export
			</button>
		</div>
	</div>

	<!-- Tab bar -->
	<div class="bg-white rounded-lg border border-slate-200 shadow-sm p-1 inline-flex self-start">
		{#each tabs as tab}
			<button
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
		<!-- Main chart -->
		<div class="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
			<div class="flex justify-between items-start">
				<div>
					<h3 class="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-1">Requests by Type</h3>
					<div class="flex items-baseline gap-3">
						<p class="text-slate-900 text-3xl font-bold tracking-tight">
							{formatCompact(totalRequests)}
						</p>
						<p class="text-green-600 text-sm font-medium flex items-center bg-green-50 px-2 py-0.5 rounded-md">
							<span class="material-symbols-outlined text-[16px] mr-1">trending_up</span> +5.2%
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
					<!-- Fallback static chart when no data -->
					<div class="absolute inset-0 flex flex-col justify-between py-6">
						<div class="border-t border-dashed border-slate-200 w-full h-0"></div>
						<div class="border-t border-dashed border-slate-200 w-full h-0"></div>
						<div class="border-t border-dashed border-slate-200 w-full h-0"></div>
						<div class="border-t border-dashed border-slate-200 w-full h-0"></div>
					</div>
					<svg class="relative z-10" fill="none" height="220" preserveAspectRatio="none" viewBox="0 0 800 220" width="100%" xmlns="http://www.w3.org/2000/svg">
						<path d="M0 200 Q 100 150, 200 170 T 400 120 T 600 160 T 800 110 L 800 220 L 0 220 Z" fill="url(#gradient-uncached)" opacity="0.3"></path>
						<path d="M0 200 Q 100 150, 200 170 T 400 120 T 600 160 T 800 110" stroke="#cbd5e1" stroke-linecap="round" stroke-width="2"></path>
						<path d="M0 150 Q 100 100, 200 120 T 400 50 T 600 90 T 800 30 L 800 220 L 0 220 Z" fill="url(#gradient-cached)" opacity="0.2"></path>
						<path d="M0 150 Q 100 100, 200 120 T 400 50 T 600 90 T 800 30" stroke="#f38020" stroke-linecap="round" stroke-width="3"></path>
						<defs>
							<linearGradient id="gradient-cached" x1="0" x2="0" y1="0" y2="1">
								<stop stop-color="#f38020" stop-opacity="0.8"></stop>
								<stop offset="1" stop-color="#f38020" stop-opacity="0"></stop>
							</linearGradient>
							<linearGradient id="gradient-uncached" x1="0" x2="0" y1="0" y2="1">
								<stop stop-color="#cbd5e1" stop-opacity="0.8"></stop>
								<stop offset="1" stop-color="#cbd5e1" stop-opacity="0"></stop>
							</linearGradient>
						</defs>
					</svg>
					<div class="flex justify-between mt-4 px-2 text-slate-500 text-xs font-semibold uppercase tracking-wider border-t border-slate-100 pt-3">
						{#each days as day}
							<span>{day}</span>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<!-- Bottom grid -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Top 5 Endpoints -->
			<div class="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm col-span-1">
				<h4 class="text-slate-900 text-sm font-semibold mb-6 flex items-center gap-2">
					<span class="material-symbols-outlined text-slate-400 text-lg">list_alt</span> Top 5 Endpoints
				</h4>
				<TopEndpoints {endpoints} />
			</div>

			<!-- Traffic by Country -->
			<div class="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm col-span-1">
				<h4 class="text-slate-900 text-sm font-semibold mb-6 flex items-center gap-2">
					<span class="material-symbols-outlined text-slate-400 text-lg">public</span> Traffic by Country
				</h4>
				{#if countries.length > 0}
					<GeoTraffic {countries} />
				{:else}
					<!-- Fallback static display -->
					<div class="flex-1 flex flex-col justify-center items-center relative min-h-[150px]">
						<div class="w-full h-32 bg-slate-50 border border-slate-100 rounded-lg mb-4 relative overflow-hidden">
							<div class="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:8px_8px] opacity-60"></div>
							<div class="absolute top-1/4 left-1/4 w-3 h-3 bg-primary rounded-full shadow-[0_0_10px_rgba(243,128,32,0.5)]"></div>
							<div class="absolute top-1/2 left-2/3 w-2 h-2 bg-primary/80 rounded-full shadow-[0_0_8px_rgba(243,128,32,0.4)]"></div>
							<div class="absolute top-1/3 left-1/2 w-1.5 h-1.5 bg-primary/60 rounded-full"></div>
							<div class="absolute bottom-1/3 left-1/3 w-1 h-1 bg-primary/40 rounded-full"></div>
						</div>
						<div class="w-full flex justify-between text-xs text-slate-600 font-medium">
							<div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-sm bg-primary"></span> US (45%)</div>
							<div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-sm bg-primary/80"></span> UK (25%)</div>
							<div class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-sm bg-primary/50"></span> DE (15%)</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Client Distribution -->
			<div class="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm col-span-1">
				<h4 class="text-slate-900 text-sm font-semibold mb-6 flex items-center gap-2">
					<span class="material-symbols-outlined text-slate-400 text-lg">devices</span> Client Distribution
				</h4>
				<div class="flex-1 flex flex-col items-center justify-center gap-6">
					<div class="relative w-32 h-32">
						<svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
							<circle class="stroke-slate-50" cx="18" cy="18" fill="transparent" r="16" stroke-width="6"></circle>
							<circle cx="18" cy="18" fill="transparent" r="16" stroke="#f38020" stroke-dasharray="100 100" stroke-dashoffset="0" stroke-width="6"></circle>
							<circle cx="18" cy="18" fill="transparent" r="16" stroke="#94a3b8" stroke-dasharray="35 100" stroke-dashoffset="-65" stroke-width="6"></circle>
							<circle cx="18" cy="18" fill="transparent" r="16" stroke="#e2e8f0" stroke-dasharray="10 100" stroke-dashoffset="-90" stroke-width="6"></circle>
						</svg>
						<div class="absolute inset-0 flex items-center justify-center flex-col">
							<span class="text-slate-900 font-bold text-xl tracking-tight">100%</span>
							<span class="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Total</span>
						</div>
					</div>
					<div class="flex w-full justify-between gap-3 text-xs">
						<div class="flex flex-col gap-1 text-slate-600">
							<div class="flex items-center gap-1.5">
								<span class="w-2 h-2 rounded-sm bg-primary"></span>
								<span>Desktop</span>
							</div>
							<span class="font-bold text-slate-900 ml-3.5">65%</span>
						</div>
						<div class="flex flex-col gap-1 text-slate-600">
							<div class="flex items-center gap-1.5">
								<span class="w-2 h-2 rounded-sm bg-slate-400"></span>
								<span>Mobile</span>
							</div>
							<span class="font-bold text-slate-900 ml-3.5">25%</span>
						</div>
						<div class="flex flex-col gap-1 text-slate-600">
							<div class="flex items-center gap-1.5">
								<span class="w-2 h-2 rounded-sm bg-slate-200"></span>
								<span>Other</span>
							</div>
							<span class="font-bold text-slate-900 ml-3.5">10%</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
