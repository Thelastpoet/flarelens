<script lang="ts">
// Rules & Limits — from stitch rules_limits_management_1/code.html
let showModal = $state(false);

const rows = $state([
	{
		id: 1,
		icon: 'database',
		name: 'KV Read Spike',
		condition: '> $5.00/hr',
		conditionClass: 'bg-red-50 text-red-700',
		service: 'KV',
		enabled: true,
	},
	{
		id: 2,
		icon: 'memory',
		name: 'Workers CPU Limit',
		condition: '> 50ms avg/req',
		conditionClass: 'bg-amber-50 text-amber-700',
		service: 'Workers',
		enabled: true,
	},
	{
		id: 3,
		icon: 'router',
		name: 'Bandwidth Surge',
		condition: '> 1TB/day',
		conditionClass: 'bg-amber-50 text-amber-700',
		service: 'CDN',
		enabled: false,
	},
	{
		id: 4,
		icon: 'shield',
		name: 'DDoS Alert',
		condition: '> 10k req/sec',
		conditionClass: 'bg-red-50 text-red-700',
		service: 'WAF',
		enabled: true,
	},
]);
</script>

<!-- Header -->
<div class="flex flex-wrap items-center justify-between gap-4 mb-6">
	<div class="flex flex-col gap-1">
		<h1 class="text-slate-900 text-2xl sm:text-[28px] font-bold leading-tight">Rules &amp; Limits</h1>
		<p class="text-slate-500 text-sm font-normal leading-normal">Manage active monitoring rules to prevent unexpected costs.</p>
	</div>
	<button
		onclick={() => showModal = true}
		class="flex items-center justify-center gap-2 rounded-lg px-4 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium leading-normal transition-colors shadow-sm"
	>
		<span class="material-symbols-outlined !text-[20px]">add</span>
		<span>Create New Rule</span>
	</button>
</div>

<!-- Table Card -->
<div class="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm mb-6">
	<div class="overflow-x-auto">
		<table class="w-full text-left border-collapse">
			<thead>
				<tr class="bg-slate-50 border-b border-slate-200">
					<th class="px-6 py-4 text-slate-700 text-sm font-semibold leading-normal w-1/3 min-w-[200px]">Rule Name</th>
					<th class="px-6 py-4 text-slate-700 text-sm font-semibold leading-normal w-1/4 min-w-[150px]">Condition</th>
					<th class="px-6 py-4 text-slate-700 text-sm font-semibold leading-normal w-1/6 min-w-[120px]">Service</th>
					<th class="px-6 py-4 text-slate-700 text-sm font-semibold leading-normal w-1/6 min-w-[120px]">Status</th>
					<th class="px-6 py-4 w-[60px]"></th>
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-100">
				{#each rows as row}
					<tr class="hover:bg-slate-50/50 transition-colors">
						<td class="px-6 py-4 text-slate-900 text-sm font-medium leading-normal">
							<div class="flex items-center gap-2">
								<span class="material-symbols-outlined text-slate-400 !text-[18px]">{row.icon}</span>
								{row.name}
							</div>
						</td>
						<td class="px-6 py-4">
							<span class="{row.conditionClass} px-2 py-1 rounded text-xs font-mono">{row.condition}</span>
						</td>
						<td class="px-6 py-4">
							<span class="inline-flex items-center justify-center rounded-md px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
								{row.service}
							</span>
						</td>
						<td class="px-6 py-4">
							<button
								onclick={() => row.enabled = !row.enabled}
								role="switch"
								aria-checked={row.enabled}
								aria-label="Toggle {row.name}"
								class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none
									{row.enabled ? 'bg-primary' : 'bg-slate-200'}"
							>
								<span class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
									{row.enabled ? 'translate-x-4' : 'translate-x-0'}">
								</span>
							</button>
						</td>
						<td class="px-6 py-4 text-right">
							<button aria-label="More options" class="text-slate-400 hover:text-slate-600">
								<span class="material-symbols-outlined !text-[20px]">more_vert</span>
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<!-- Info banner -->
<div class="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 items-start">
	<span class="material-symbols-outlined text-blue-500 mt-0.5">info</span>
	<div class="flex flex-col gap-1 text-sm text-blue-800">
		<p class="font-medium">Need more granular control?</p>
		<p class="text-blue-600">You can create custom rules using specific API endpoints or geographic regions.
			<a href="/rules/custom" class="underline hover:text-blue-700">Learn more about custom rules</a>.
		</p>
	</div>
</div>

<!-- Modal — Create New Rule -->
{#if showModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<button aria-label="Close modal" class="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onclick={() => showModal = false}></button>
		<div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
			<div class="flex items-center justify-between mb-7">
				<h2 class="text-xl font-bold text-slate-900">Create New Rule</h2>
				<button onclick={() => showModal = false} class="p-1 text-slate-400 hover:text-slate-600 rounded">
					<span class="material-symbols-outlined">close</span>
				</button>
			</div>

			<div class="space-y-5">
				<div>
					<label class="block text-sm font-bold text-slate-800 mb-2" for="rule-name">1. Rule Name</label>
					<input type="text" id="rule-name" placeholder="e.g., Critical Cost Spike"
						class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50" />
				</div>

				<div>
					<label class="block text-sm font-bold text-slate-800 mb-2" for="rule-service">2. Service Selection</label>
					<div class="relative">
						<select id="rule-service" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-500 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-primary/20">
							<option value="">Select a service</option>
							<option>Workers</option><option>KV</option><option>CDN</option><option>WAF</option><option>R2</option>
						</select>
						<span class="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 pointer-events-none !text-[20px]">expand_more</span>
					</div>
				</div>

				<div>
					<label class="block text-sm font-bold text-slate-800 mb-2" for="rule-condition-metric">3. Condition</label>
					<div class="flex items-center gap-2">
						<div class="relative">
							<select id="rule-condition-metric" class="pl-3 pr-8 py-2.5 border border-slate-200 rounded-xl text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-primary/20">
								<option>Requests</option><option>Cost</option><option>CPU Time</option>
							</select>
							<span class="material-symbols-outlined absolute right-2 top-2.5 text-slate-400 pointer-events-none !text-[16px]">expand_more</span>
						</div>
						<span class="text-base text-slate-400 font-medium">&gt;</span>
						<div class="flex-1 flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50">
							<span class="px-3 py-2.5 text-sm text-slate-400 bg-slate-50 border-r border-slate-200">$</span>
							<input type="number" value="0.00" class="flex-1 px-3 py-2.5 text-sm focus:outline-none" />
						</div>
					</div>
				</div>

				<div>
					<label class="block text-sm font-bold text-slate-800 mb-2" for="rule-frequency">4. Notification Frequency</label>
					<div class="relative">
						<select id="rule-frequency" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-primary/20">
							<option>Instant Alert</option><option>Hourly Digest</option><option>Daily Summary</option>
						</select>
						<span class="material-symbols-outlined absolute right-3 top-2.5 text-slate-400 pointer-events-none !text-[20px]">expand_more</span>
					</div>
				</div>
			</div>

			<div class="flex items-center justify-end gap-3 mt-8 pt-5 border-t border-slate-100">
				<button onclick={() => showModal = false}
					class="px-5 py-2.5 text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50">
					Cancel
				</button>
				<button class="px-5 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary/90 shadow-sm">
					Create Rule
				</button>
			</div>
		</div>
	</div>
{/if}
