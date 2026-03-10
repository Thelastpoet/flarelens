<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { api, ApiRequestError } from '$lib/api.js';
	import type { PageData } from './$types.js';

	let { data }: { data: PageData } = $props();

	let budgetDraft = $state('');
	let savingBudget = $state(false);
	let budgetError = $state<string | null>(null);

	const overview = $derived(data.overview);
	const breakdown = $derived(data.breakdown.services);
	const budget = $derived(data.budget);
	const topDrivers = $derived(data.topDrivers);
	const invoices = $derived(data.invoices);

	const breakdownColors = ['bg-primary', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-400'];

	$effect(() => {
		budgetDraft = budget.budget_limit != null ? String(budget.budget_limit) : '';
	});

	function formatCurrency(value: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			maximumFractionDigits: 2,
		}).format(value);
	}

	function formatPeriodLabel(start: string | null, end: string | null): string {
		if (!start || !end) return 'Current Billing Cycle';
		const startDate = new Date(start);
		const endDate = new Date(end);
		return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
	}

	function trendLabel(current: number, comparison: number): { text: string; className: string; icon: string } {
		if (current === comparison) {
			return { text: '0%', className: 'text-slate-500 bg-slate-100', icon: 'trending_flat' };
		}
		const diff = comparison === 0 ? 100 : Math.round(((current - comparison) / comparison) * 100);
		if (diff > 0) {
			return { text: `${diff}%`, className: 'text-amber-600 bg-amber-50', icon: 'trending_up' };
		}
		return {
			text: `${Math.abs(diff)}%`,
			className: 'text-emerald-600 bg-emerald-50',
			icon: 'trending_down',
		};
	}

	const spentTrend = $derived(trendLabel(overview.current_estimated_spend, overview.daily_estimated_average * 30));
	const projectedTrend = $derived(trendLabel(overview.projected_monthly_estimated, overview.current_estimated_spend));
	const dailyTrend = $derived(trendLabel(overview.daily_estimated_average, overview.current_estimated_spend / 30 || overview.daily_estimated_average));
	const budgetPct = $derived(budget.pct_used != null ? Math.max(0, Math.min(100, budget.pct_used)) : 0);

	function serviceLabel(raw: string): string {
		return raw
			.replace(/_/g, ' ')
			.replace(/\bestimated\b/gi, '')
			.replace(/\s+/g, ' ')
			.trim()
			.replace(/\b\w/g, (char) => char.toUpperCase());
	}

	async function saveBudget() {
		budgetError = null;
		savingBudget = true;
		try {
			await api.patch('/billing/budget', {
				limit: budgetDraft.trim().length === 0 ? null : Number(budgetDraft),
			});
			await invalidateAll();
		} catch (error) {
			budgetError = error instanceof ApiRequestError ? error.message : 'Unable to update budget.';
		} finally {
			savingBudget = false;
		}
	}
</script>

<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
	<div class="flex flex-col gap-1">
		<h1 class="text-slate-900 text-2xl sm:text-[28px] font-bold leading-tight">Billing Overview</h1>
		<div class="flex items-center gap-2">
			<div class="size-2 rounded-full {overview.source === 'none' ? 'bg-slate-400' : overview.is_estimated ? 'bg-amber-500' : 'bg-emerald-500'}"></div>
			<p class="text-slate-500 text-sm font-medium leading-normal">
				Current Billing Cycle: {formatPeriodLabel(overview.period_start, overview.period_end)}
				{#if overview.is_estimated}
					· Estimated
				{/if}
			</p>
		</div>
	</div>
	<div class="flex items-center gap-3">
		<div class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
			{overview.source === 'billing_snapshot' ? 'Snapshot-backed' : overview.source === 'estimated_snapshots' ? 'Estimate-backed' : 'No billing data yet'}
		</div>
	</div>
</div>

<!-- Stat cards -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
	<div class="flex flex-col gap-3 rounded-xl p-5 border border-slate-200 bg-white shadow-sm">
		<div class="flex justify-between items-start">
			<p class="text-slate-500 text-sm font-medium leading-normal">Spent This Month</p>
			<span class="material-symbols-outlined text-slate-400 !text-[20px]">account_balance_wallet</span>
		</div>
		<div class="flex items-baseline gap-3">
			<p class="text-slate-900 text-3xl font-bold leading-tight tracking-tight">{formatCurrency(overview.current_estimated_spend)}</p>
			<div class="flex items-center text-sm font-semibold px-2 py-0.5 rounded-md {spentTrend.className}">
				<span class="material-symbols-outlined !text-[16px]">{spentTrend.icon}</span>
				<span>{spentTrend.text}</span>
			</div>
		</div>
		<div class="w-full bg-slate-100 rounded-full h-1.5 mt-2">
			<div class="bg-primary h-1.5 rounded-full" style="width: {budgetPct}%"></div>
		</div>
		<p class="text-xs text-slate-500 mt-1">
			{#if budget.budget_limit != null}
				{budgetPct}% of {formatCurrency(budget.budget_limit)} budget
			{:else}
				No budget set
			{/if}
		</p>
	</div>

	<div class="flex flex-col gap-3 rounded-xl p-5 border border-slate-200 bg-white shadow-sm">
		<div class="flex justify-between items-start">
			<p class="text-slate-500 text-sm font-medium leading-normal">Projected</p>
			<span class="material-symbols-outlined text-slate-400 !text-[20px]">monitoring</span>
		</div>
		<div class="flex items-baseline gap-3">
			<p class="text-slate-900 text-3xl font-bold leading-tight tracking-tight">{formatCurrency(overview.projected_monthly_estimated)}</p>
			<div class="flex items-center text-sm font-semibold px-2 py-0.5 rounded-md {projectedTrend.className}">
				<span class="material-symbols-outlined !text-[16px]">{projectedTrend.icon}</span>
				<span>{projectedTrend.text}</span>
			</div>
		</div>
		<p class="text-xs text-slate-500 mt-auto pt-1">Estimated total by end of current billing cycle</p>
	</div>

	<div class="flex flex-col gap-3 rounded-xl p-5 border border-slate-200 bg-white shadow-sm">
		<div class="flex justify-between items-start">
			<p class="text-slate-500 text-sm font-medium leading-normal">Daily Average</p>
			<span class="material-symbols-outlined text-slate-400 !text-[20px]">today</span>
		</div>
		<div class="flex items-baseline gap-3">
			<p class="text-slate-900 text-3xl font-bold leading-tight tracking-tight">{formatCurrency(overview.daily_estimated_average)}</p>
			<div class="flex items-center text-sm font-semibold px-2 py-0.5 rounded-md {dailyTrend.className}">
				<span class="material-symbols-outlined !text-[16px]">{dailyTrend.icon}</span>
				<span>{dailyTrend.text}</span>
			</div>
		</div>
		<p class="text-xs text-slate-500 mt-auto pt-1">Average daily spend observed in the current cycle</p>
	</div>
</div>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
	<!-- Usage Breakdown -->
	<div class="lg:col-span-2 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
		<div>
			<h3 class="text-slate-900 text-lg font-semibold leading-normal">Usage Breakdown by Service</h3>
			<p class="text-slate-500 text-sm font-normal">Estimated cost distribution across currently observed services</p>
		</div>
		<div class="flex flex-col gap-6 w-full mt-2">
			{#if breakdown.length === 0}
				<div class="rounded-lg border border-slate-100 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
					No billing breakdown available yet.
				</div>
			{:else}
			{#each breakdown as row, index}
				<div class="flex items-center gap-4">
					<div class="w-24 text-sm font-medium text-slate-700 shrink-0">{serviceLabel(row.service)}</div>
					<div class="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
						<div class="{breakdownColors[index % breakdownColors.length]} h-full rounded-full" style="width: {Math.max(row.pct, 2)}%"></div>
					</div>
					<div class="w-16 text-right text-sm font-semibold text-slate-900 shrink-0">{formatCurrency(row.cost)}</div>
				</div>
			{/each}
			{/if}
		</div>
		<!-- Legend -->
		<div class="mt-4 border-t border-slate-100 pt-6">
			<div class="flex items-center gap-4 text-xs font-medium justify-center flex-wrap">
				{#each breakdown as row, index}
					<div class="flex items-center gap-1.5">
						<div class="w-3 h-3 rounded-sm {breakdownColors[index % breakdownColors.length]}"></div>
						<span class="text-slate-600">{serviceLabel(row.service)}</span>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Right column -->
	<div class="flex flex-col gap-6">
		<!-- Top Cost Drivers -->
		<div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
			<h3 class="text-slate-900 text-base font-semibold leading-normal mb-4">Top Cost Drivers</h3>
			<div class="flex flex-col gap-4">
				{#if topDrivers.length === 0}
					<p class="text-sm text-slate-500">No billing drivers available yet.</p>
				{:else}
				{#each topDrivers as d, i}
					<div class="flex justify-between items-center {i < 2 ? 'border-b border-slate-100 pb-3' : ''}">
						<div class="flex flex-col">
							<span class="text-sm font-medium text-slate-900">{serviceLabel(d.service)}</span>
							<span class="text-xs text-slate-500">{overview.is_estimated ? 'Estimated cost driver' : 'Billing snapshot driver'}</span>
						</div>
						<div class="flex flex-col items-end">
							<span class="text-sm font-bold text-slate-900">{formatCurrency(d.cost)}</span>
							<span class="text-[10px] font-medium text-slate-400">
								{overview.is_estimated ? 'Estimate' : 'Snapshot'}
							</span>
						</div>
					</div>
				{/each}
				{/if}
			</div>
		</div>

		<div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
			<h3 class="text-slate-900 text-base font-semibold leading-normal mb-4">Budget Limit</h3>
			<div class="space-y-3">
				<div>
					<label for="billing-budget-limit" class="mb-2 block text-sm font-medium text-slate-700">Monthly budget</label>
					<input
						id="billing-budget-limit"
						bind:value={budgetDraft}
						type="number"
						min="0"
						step="0.01"
						class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
						placeholder="No limit"
					/>
				</div>
				<button
					type="button"
					class="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
					onclick={saveBudget}
					disabled={savingBudget}
				>
					Save Budget
				</button>
				{#if budgetError}
					<p class="text-sm text-red-600">{budgetError}</p>
				{/if}
			</div>
		</div>

		<!-- Recent Invoices -->
		<div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex-1">
			<div class="flex justify-between items-center mb-4">
				<h3 class="text-slate-900 text-base font-semibold leading-normal">Recent Invoices</h3>
				<span class="text-xs font-medium text-slate-400">History</span>
			</div>
			<div class="flex flex-col gap-4">
				{#if invoices.length === 0}
					<p class="text-sm text-slate-500">No invoice snapshots are available yet.</p>
				{:else}
				{#each invoices as inv}
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<div class="p-2 bg-slate-50 rounded-lg text-slate-500 border border-slate-200">
								<span class="material-symbols-outlined !text-[20px]">receipt</span>
							</div>
							<div class="flex flex-col gap-0.5">
								<p class="text-sm font-medium text-slate-900">
									{formatPeriodLabel(inv.period_start, inv.period_end)}
								</p>
								<p class="text-xs text-slate-500">
									{inv.status === 'invoice' ? 'Invoice snapshot' : 'Active snapshot'}
								</p>
							</div>
						</div>
						<span class="text-sm font-semibold text-slate-900">{formatCurrency(inv.total_cost)}</span>
					</div>
				{/each}
				{/if}
			</div>
		</div>
	</div>
</div>
