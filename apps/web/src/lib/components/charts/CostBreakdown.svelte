<script lang="ts">
interface Props {
	workers: number;
	cdn: number;
	r2: number;
	kv: number;
	d1: number;
	total: number;
}

let { workers = 0, cdn = 0, r2 = 0, kv = 0, d1 = 0, total = 0 }: Props = $props();

const services = $derived([
	{ label: 'Workers', value: workers, color: '#f38020' },
	{ label: 'CDN', value: cdn, color: '#3b82f6' },
	{ label: 'R2', value: r2, color: '#22c55e' },
	{ label: 'KV', value: kv, color: '#a855f7' },
	{ label: 'D1', value: d1, color: '#14b8a6' },
]);

function barWidth(value: number): string {
	if (total === 0) return '0%';
	return `${Math.min(100, (value / total) * 100).toFixed(1)}%`;
}

function formatCost(value: number): string {
	return `$${value.toFixed(2)}`;
}
</script>

{#if total === 0}
	<div class="flex items-center justify-center py-8 text-slate-400 text-sm">
		No cost data available
	</div>
{:else}
	<div class="flex flex-col gap-4">
		{#each services as service}
			{#if service.value > 0}
				<div class="flex flex-col gap-1.5">
					<div class="flex justify-between items-center text-sm">
						<span class="text-slate-700 font-medium">{service.label}</span>
						<span class="text-slate-900 font-semibold">{formatCost(service.value)}</span>
					</div>
					<div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
						<div
							class="h-full rounded-full transition-all duration-500"
							style="width: {barWidth(service.value)}; background-color: {service.color};"
						></div>
					</div>
				</div>
			{/if}
		{/each}
		<div class="pt-3 border-t border-slate-100 flex justify-between items-center text-sm font-semibold">
			<span class="text-slate-700">Total</span>
			<span class="text-slate-900">{formatCost(total)}</span>
		</div>
	</div>
{/if}
