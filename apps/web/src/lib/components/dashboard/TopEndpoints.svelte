<script lang="ts">
interface TopEndpoint {
	path: string;
	requests: number;
	bytes: number;
	pctOfTotal: number;
}

interface Props {
	endpoints: TopEndpoint[];
}

let { endpoints = [] }: Props = $props();

const totalRequests = $derived(endpoints.reduce((sum, endpoint) => sum + (endpoint.requests ?? 0), 0));

function formatRequests(n: number): string {
	return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(n);
}

function widthPct(endpoint: TopEndpoint): string {
	const pct =
		typeof endpoint.pctOfTotal === 'number'
			? endpoint.pctOfTotal
			: totalRequests > 0
				? (endpoint.requests / totalRequests) * 100
				: 0;
	return `${Math.min(100, pct).toFixed(1)}%`;
}
</script>

{#if endpoints.length === 0}
	<div class="flex items-center justify-center py-8 text-slate-400 text-sm">
		No endpoint data available
	</div>
{:else}
	<div class="flex flex-col gap-5 text-sm">
		{#each endpoints as endpoint, i}
			<div class="flex justify-between items-center group">
				<div class="flex items-center gap-2 min-w-0 mr-2">
					<span class="text-xs font-bold text-slate-400 w-4 shrink-0">{i + 1}</span>
					<span
						class="text-slate-700 font-mono truncate bg-slate-50 px-2 py-0.5 rounded text-xs border border-slate-100"
						title={endpoint.path}
					>
						{endpoint.path}
					</span>
				</div>
				<div class="flex items-center gap-3 shrink-0">
					<span class="text-slate-900 font-semibold w-10 text-right text-xs">
						{formatRequests(endpoint.requests)}
					</span>
					<div class="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
						<div
							class="bg-primary h-full rounded-full"
							style={`width: ${widthPct(endpoint)}`}
						></div>
					</div>
				</div>
			</div>
		{/each}
	</div>
{/if}
