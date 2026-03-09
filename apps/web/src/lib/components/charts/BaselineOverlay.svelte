<script lang="ts">
interface BaselineComparison {
	metric: string;
	current: number;
	baseline: number;
	deviation: number;
	deviationPct: number;
	status: 'normal' | 'warning' | 'high' | 'critical';
}

interface Props {
	comparisons: BaselineComparison[];
}

let { comparisons = [] }: Props = $props();

function statusColor(status: BaselineComparison['status']): string {
	switch (status) {
		case 'normal':
			return 'text-emerald-600 bg-emerald-50';
		case 'warning':
			return 'text-yellow-600 bg-yellow-50';
		case 'high':
			return 'text-orange-600 bg-orange-50';
		case 'critical':
			return 'text-red-600 bg-red-50';
	}
}

function deviationColor(status: BaselineComparison['status']): string {
	switch (status) {
		case 'normal':
			return 'text-emerald-600';
		case 'warning':
			return 'text-yellow-600';
		case 'high':
			return 'text-orange-600';
		case 'critical':
			return 'text-red-600';
	}
}

function formatValue(value: number): string {
	return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value);
}

function formatPct(pct: number): string {
	const sign = pct >= 0 ? '+' : '';
	return `${sign}${pct.toFixed(1)}%`;
}
</script>

{#if comparisons.length === 0}
	<div class="flex items-center justify-center py-8 text-slate-400 text-sm">
		No baseline data available
	</div>
{:else}
	<div class="flex flex-col divide-y divide-slate-100">
		{#each comparisons as comparison}
			<div class="flex items-center justify-between py-3 gap-4">
				<div class="flex flex-col gap-0.5 min-w-0">
					<span class="text-sm font-medium text-slate-900 truncate">{comparison.metric}</span>
					<div class="flex items-center gap-2 text-xs text-slate-500">
						<span>Current: <span class="font-medium text-slate-700">{formatValue(comparison.current)}</span></span>
						<span>·</span>
						<span>Baseline: <span class="font-medium text-slate-700">{formatValue(comparison.baseline)}</span></span>
					</div>
				</div>
				<div class="flex items-center gap-2 shrink-0">
					<span class="text-sm font-semibold {deviationColor(comparison.status)}">
						{formatPct(comparison.deviationPct)}
					</span>
					<span class="text-xs font-medium px-2 py-0.5 rounded-full {statusColor(comparison.status)}">
						{comparison.status}
					</span>
				</div>
			</div>
		{/each}
	</div>
{/if}
