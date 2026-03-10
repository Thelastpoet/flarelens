<script lang="ts">
interface Contributor {
	type: 'endpoint' | 'user_agent' | 'country' | 'asn';
	value: string;
	requests: number;
	contributionPct: number;
	baselineRequests?: number;
	changeFromBaseline?: number;
}

let { contributors }: { contributors: Contributor[] } = $props();

const typeConfig: Record<string, { label: string; icon: string }> = {
	endpoint: { label: 'Top Endpoints', icon: 'link' },
	user_agent: { label: 'User Agents', icon: 'devices' },
	country: { label: 'Countries', icon: 'public' },
	asn: { label: 'ASNs / Networks', icon: 'router' },
};

const grouped = $derived(
	Object.entries(
		contributors.reduce<Record<string, Contributor[]>>((acc, c) => {
			const group = acc[c.type] ?? [];
			group.push(c);
			acc[c.type] = group;
			return acc;
		}, {}),
	),
);

let expanded = $state<Record<string, boolean>>({});
function toggle(type: string) {
	expanded[type] = !expanded[type];
}

function formatChange(pct: number): string {
	return `${(pct >= 0 ? '+' : '') + pct.toFixed(1)}%`;
}
</script>

<div class="flex flex-col gap-3">
	{#each grouped as [type, items]}
		{@const config = typeConfig[type] ?? { label: type, icon: 'category' }}
		{@const isOpen = expanded[type] ?? true}

		<div class="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
			<!-- Card header -->
			<button
				onclick={() => toggle(type)}
				class="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
			>
				<div class="flex items-center gap-2.5">
					<span class="material-symbols-outlined text-slate-400 !text-[20px]">{config.icon}</span>
					<span class="text-sm font-semibold text-slate-900">{config.label}</span>
					<span class="text-xs text-slate-400 font-normal">({items.length})</span>
				</div>
				<span class="material-symbols-outlined text-slate-400 !text-[20px] transition-transform duration-200 {isOpen ? 'rotate-180' : ''}">
					expand_more
				</span>
			</button>

			{#if isOpen}
				<div class="border-t border-slate-100 divide-y divide-slate-50">
					{#each items as c}
						<div class="px-5 py-3 flex items-center gap-3">
							<!-- Label -->
							<span class="text-sm text-slate-700 w-44 shrink-0 truncate font-mono" title={c.value}>
								{c.value}
							</span>

							<!-- Bar -->
							<div class="flex-1 h-2 rounded-full bg-slate-100">
								<div
									class="h-2 rounded-full bg-orange-400"
									style="width: {Math.min(c.contributionPct, 100)}%"
								></div>
							</div>

							<!-- Pct -->
							<span class="text-sm font-semibold text-slate-800 w-11 text-right shrink-0">
								{c.contributionPct.toFixed(1)}%
							</span>

							<!-- Change from baseline -->
							{#if c.changeFromBaseline != null}
								<span
									class="text-xs font-medium w-16 text-right shrink-0 {c.changeFromBaseline > 0 ? 'text-red-500' : 'text-emerald-600'}"
									title="vs baseline"
								>
									{formatChange(c.changeFromBaseline)}
								</span>
							{:else}
								<span class="w-16 shrink-0"></span>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/each}
</div>
