<script lang="ts">
// Billing Overview — from stitch dashboard_overview_1/code.html
</script>

<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
	<div class="flex flex-col gap-1">
		<h1 class="text-slate-900 text-2xl sm:text-[28px] font-bold leading-tight">Billing Overview</h1>
		<div class="flex items-center gap-2">
			<div class="size-2 rounded-full bg-emerald-500"></div>
			<p class="text-slate-500 text-sm font-medium leading-normal">Current Billing Cycle: Oct 1 - Oct 31</p>
		</div>
	</div>
	<div class="flex items-center gap-3">
		<select class="bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:ring-primary focus:border-primary py-2 pl-3 pr-10 shadow-sm">
			<option>October 2023</option>
			<option>September 2023</option>
			<option>August 2023</option>
		</select>
		<button class="p-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
			<span class="material-symbols-outlined !text-[20px]">file_download</span>
		</button>
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
			<p class="text-slate-900 text-3xl font-bold leading-tight tracking-tight">$450.25</p>
			<div class="flex items-center text-amber-600 text-sm font-semibold bg-amber-50 px-2 py-0.5 rounded-md">
				<span class="material-symbols-outlined !text-[16px]">trending_up</span>
				<span>12%</span>
			</div>
		</div>
		<div class="w-full bg-slate-100 rounded-full h-1.5 mt-2">
			<div class="bg-primary h-1.5 rounded-full" style="width: 72%"></div>
		</div>
		<p class="text-xs text-slate-500 mt-1">72% of $620 budget</p>
	</div>

	<div class="flex flex-col gap-3 rounded-xl p-5 border border-slate-200 bg-white shadow-sm">
		<div class="flex justify-between items-start">
			<p class="text-slate-500 text-sm font-medium leading-normal">Projected</p>
			<span class="material-symbols-outlined text-slate-400 !text-[20px]">monitoring</span>
		</div>
		<div class="flex items-baseline gap-3">
			<p class="text-slate-900 text-3xl font-bold leading-tight tracking-tight">$580.00</p>
			<div class="flex items-center text-emerald-600 text-sm font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">
				<span class="material-symbols-outlined !text-[16px]">trending_down</span>
				<span>6%</span>
			</div>
		</div>
		<p class="text-xs text-slate-500 mt-auto pt-1">Estimated total by end of month</p>
	</div>

	<div class="flex flex-col gap-3 rounded-xl p-5 border border-slate-200 bg-white shadow-sm">
		<div class="flex justify-between items-start">
			<p class="text-slate-500 text-sm font-medium leading-normal">Daily Average</p>
			<span class="material-symbols-outlined text-slate-400 !text-[20px]">today</span>
		</div>
		<div class="flex items-baseline gap-3">
			<p class="text-slate-900 text-3xl font-bold leading-tight tracking-tight">$14.52</p>
			<div class="flex items-center text-emerald-600 text-sm font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">
				<span class="material-symbols-outlined !text-[16px]">trending_down</span>
				<span>2%</span>
			</div>
		</div>
		<p class="text-xs text-slate-500 mt-auto pt-1">Based on last 30 days usage</p>
	</div>
</div>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
	<!-- Usage Breakdown -->
	<div class="lg:col-span-2 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
		<div>
			<h3 class="text-slate-900 text-lg font-semibold leading-normal">Usage Breakdown by Service</h3>
			<p class="text-slate-500 text-sm font-normal">Cost distribution across active Cloudflare services</p>
		</div>
		<div class="flex flex-col gap-6 w-full mt-2">
			{#each [
				{ service: 'Workers',    amount: 202.61, color: 'bg-primary',      pct: 45 },
				{ service: 'CDN',        amount: 112.56, color: 'bg-blue-500',     pct: 25 },
				{ service: 'WAF',        amount: 67.53,  color: 'bg-emerald-500',  pct: 15 },
				{ service: 'R2 Storage', amount: 45.02,  color: 'bg-purple-500',   pct: 10 },
				{ service: 'KV',         amount: 22.53,  color: 'bg-amber-400',    pct: 5  },
			] as row}
				<div class="flex items-center gap-4">
					<div class="w-24 text-sm font-medium text-slate-700 shrink-0">{row.service}</div>
					<div class="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
						<div class="{row.color} h-full rounded-full" style="width: {row.pct}%"></div>
					</div>
					<div class="w-16 text-right text-sm font-semibold text-slate-900 shrink-0">${row.amount.toFixed(2)}</div>
				</div>
			{/each}
		</div>
		<!-- Legend -->
		<div class="mt-4 border-t border-slate-100 pt-6">
			<div class="flex items-center gap-4 text-xs font-medium justify-center flex-wrap">
				{#each [['bg-primary','Workers'],['bg-blue-500','CDN'],['bg-emerald-500','WAF'],['bg-purple-500','R2'],['bg-amber-400','KV']] as [color, label]}
					<div class="flex items-center gap-1.5">
						<div class="w-3 h-3 rounded-sm {color}"></div>
						<span class="text-slate-600">{label}</span>
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
				{#each [
					{ name: 'api.example.com', type: 'Worker Requests',   amount: 84.20, trend: '+15% vs last week', trendClass: 'text-amber-600' },
					{ name: 'static-assets',   type: 'R2 Storage Egress', amount: 32.50, trend: '-4% vs last week',  trendClass: 'text-emerald-600' },
					{ name: 'auth-middleware', type: 'Worker Executions', amount: 28.10, trend: 'Stable',            trendClass: 'text-slate-400' },
				] as d, i}
					<div class="flex justify-between items-center {i < 2 ? 'border-b border-slate-100 pb-3' : ''}">
						<div class="flex flex-col">
							<span class="text-sm font-medium text-slate-900">{d.name}</span>
							<span class="text-xs text-slate-500">{d.type}</span>
						</div>
						<div class="flex flex-col items-end">
							<span class="text-sm font-bold text-slate-900">${d.amount.toFixed(2)}</span>
							<span class="text-[10px] font-medium {d.trendClass}">{d.trend}</span>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Recent Invoices -->
		<div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex-1">
			<div class="flex justify-between items-center mb-4">
				<h3 class="text-slate-900 text-base font-semibold leading-normal">Recent Invoices</h3>
				<a href="/billing/invoices" class="text-xs font-medium text-primary hover:underline">View All</a>
			</div>
			<div class="flex flex-col gap-4">
				{#each [
					{ period: 'Sep 2023', status: 'Paid', date: 'Oct 1, 2023',  amount: 425.80 },
					{ period: 'Aug 2023', status: 'Paid', date: 'Sep 1, 2023',  amount: 390.15 },
					{ period: 'Jul 2023', status: 'Paid', date: 'Aug 1, 2023',  amount: 385.40 },
				] as inv}
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<div class="p-2 bg-slate-50 rounded-lg text-slate-500 border border-slate-200">
								<span class="material-symbols-outlined !text-[20px]">receipt</span>
							</div>
							<div class="flex flex-col gap-0.5">
								<p class="text-sm font-medium text-slate-900">{inv.period}</p>
								<p class="text-xs text-slate-500">{inv.status} · {inv.date}</p>
							</div>
						</div>
						<span class="text-sm font-semibold text-slate-900">${inv.amount.toFixed(2)}</span>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>
