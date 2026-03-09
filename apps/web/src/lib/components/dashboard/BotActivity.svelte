<script lang="ts">
interface BotActivityItem {
	userAgent: string;
	requests: number;
	pctOfTotal: number;
	isBot: boolean;
}

interface Props {
	bots: BotActivityItem[];
	botTrafficPct: number;
}

let { bots = [], botTrafficPct = 0 }: Props = $props();

const botPctColor = $derived(
	botTrafficPct > 30 ? 'text-red-600' : botTrafficPct > 10 ? 'text-amber-600' : 'text-emerald-600',
);

const botPctLabel = $derived(
	botTrafficPct > 30 ? 'Critical' : botTrafficPct > 10 ? 'Elevated' : 'Normal',
);

const botPctLabelColor = $derived(
	botTrafficPct > 30
		? 'text-red-600 bg-red-50'
		: botTrafficPct > 10
			? 'text-amber-600 bg-amber-50'
			: 'text-emerald-600 bg-emerald-50',
);

const topBots = $derived(bots.filter((b) => b.isBot).slice(0, 5));

function formatRequests(n: number): string {
	return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(n);
}

function truncateAgent(ua: string): string {
	return ua.length > 40 ? `${ua.slice(0, 40)}…` : ua;
}
</script>

<div class="flex flex-col gap-4">
	<!-- Bot percentage summary -->
	<div class="flex items-center justify-between">
		<div class="flex flex-col gap-0.5">
			<p class="text-sm font-medium text-slate-700">Bot Traffic</p>
			<p class="text-xs text-slate-500">vs Legitimate traffic</p>
		</div>
		<div class="flex flex-col items-end gap-0.5">
			<p class="text-2xl font-bold {botPctColor}">{botTrafficPct.toFixed(1)}%</p>
			<span class="text-xs font-medium px-2 py-0.5 rounded-full {botPctLabelColor}">
				{botPctLabel}
			</span>
		</div>
	</div>

	<!-- Bot user agents list -->
	{#if topBots.length > 0}
		<div class="flex flex-col gap-2">
			<p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Top Bot Agents</p>
			{#each topBots as bot}
				<div class="flex flex-col gap-1">
					<div class="flex justify-between items-start gap-2 text-xs">
						<span
							class="text-slate-600 font-mono truncate bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100"
							title={bot.userAgent}
						>
							{truncateAgent(bot.userAgent)}
						</span>
						<span class="text-slate-900 font-semibold shrink-0">{formatRequests(bot.requests)}</span>
					</div>
					<div class="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
						<div
							class="bg-amber-400 h-full rounded-full"
							style="width: {Math.min(100, bot.pctOfTotal).toFixed(1)}%"
						></div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-xs text-slate-400 text-center py-2">No bot agents detected</p>
	{/if}
</div>
