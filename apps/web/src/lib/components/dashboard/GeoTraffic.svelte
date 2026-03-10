<script lang="ts">
interface GeoTrafficItem {
	country: string;
	requests: number;
	pctOfTotal: number;
}

interface Props {
	countries: GeoTrafficItem[];
}

let { countries = [] }: Props = $props();

const topCountries = $derived(countries.slice(0, 10));
const totalRequests = $derived(countries.reduce((sum, item) => sum + (item.requests ?? 0), 0));

function formatRequests(n: number): string {
	return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(n);
}

function formatPct(n: number): string {
	return `${n.toFixed(1)}%`;
}

function pctFor(item: GeoTrafficItem): number {
	if (typeof item.pctOfTotal === 'number') return item.pctOfTotal;
	return totalRequests > 0 ? (item.requests / totalRequests) * 100 : 0;
}
</script>

{#if topCountries.length === 0}
	<div class="flex items-center justify-center py-8 text-slate-400 text-sm">No geo data</div>
{:else}
	<div class="flex flex-col gap-3">
		{#each topCountries as item}
			<div class="flex flex-col gap-1">
				<div class="flex justify-between items-center text-sm">
					<span class="text-slate-700 font-medium">{item.country}</span>
					<div class="flex items-center gap-2 text-xs text-slate-500">
						<span class="font-medium text-slate-900">{formatRequests(item.requests)}</span>
						<span class="text-slate-400">{formatPct(pctFor(item))}</span>
					</div>
				</div>
				<div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
					<div
						class="bg-primary h-full rounded-full"
						style={`width: ${Math.min(100, pctFor(item)).toFixed(1)}%`}
					></div>
				</div>
			</div>
		{/each}
	</div>
{/if}
