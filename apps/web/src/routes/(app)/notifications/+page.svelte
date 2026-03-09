<script lang="ts">
// Notification Center / Inbox — from stitch notification_center_inbox_1/code.html
</script>

<div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6">
	<div class="flex flex-col gap-1">
		<h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Inbox</h1>
		<p class="text-slate-500 text-sm">You have 3 unread critical notifications.</p>
	</div>
	<div class="flex gap-3">
		<button class="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium transition-colors">
			<span class="material-symbols-outlined !text-[20px]">done_all</span>
			Mark all as read
		</button>
		<button class="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-medium transition-colors">
			<span class="material-symbols-outlined !text-[20px]">archive</span>
			Archive All
		</button>
	</div>
</div>

<div class="flex flex-col gap-4">
	<!-- Critical: Bandwidth spike -->
	<div class="relative flex gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
		<div class="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500"></div>
		<div class="flex items-start gap-4 w-full pl-2">
			<div class="flex items-center justify-center shrink-0 w-10 h-10 rounded-full bg-red-100 text-red-600">
				<span class="material-symbols-outlined">trending_up</span>
			</div>
			<div class="flex flex-col flex-1 min-w-0">
				<div class="flex items-center justify-between gap-2 mb-1">
					<h3 class="text-slate-900 font-semibold truncate text-base">Bandwidth Usage Spike Detected</h3>
					<span class="text-slate-500 text-xs shrink-0 font-medium">15 mins ago</span>
				</div>
				<p class="text-slate-600 text-sm line-clamp-2 mb-3">
					Egress traffic for domain <span class="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded text-slate-800">example.com</span>
					has increased by 300% in the last 10 minutes, potentially exceeding daily limits.
				</p>
				<div class="flex gap-3">
					<button class="text-primary text-sm font-medium hover:underline flex items-center gap-1">
						View Details
						<span class="material-symbols-outlined !text-[16px]">arrow_forward</span>
					</button>
					<button class="text-slate-500 text-sm font-medium hover:text-slate-700">Dismiss</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Warning: Budget at 80% -->
	<div class="relative flex gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
		<div class="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>
		<div class="flex items-start gap-4 w-full pl-2">
			<div class="flex items-center justify-center shrink-0 w-10 h-10 rounded-full bg-orange-100 text-primary">
				<span class="material-symbols-outlined">pie_chart</span>
			</div>
			<div class="flex flex-col flex-1 min-w-0">
				<div class="flex items-center justify-between gap-2 mb-1">
					<h3 class="text-slate-900 font-semibold truncate text-base">Monthly Budget at 80%</h3>
					<span class="text-slate-500 text-xs shrink-0 font-medium">2 hours ago</span>
				</div>
				<p class="text-slate-600 text-sm line-clamp-2 mb-3">
					Your current estimated monthly cost is $400, approaching your $500 limit.
					At current burn rate, budget will be depleted in 5 days.
				</p>
				<div class="flex gap-3">
					<button class="text-primary text-sm font-medium hover:underline flex items-center gap-1">
						Manage Budget
						<span class="material-symbols-outlined !text-[16px]">arrow_forward</span>
					</button>
					<button class="text-slate-500 text-sm font-medium hover:text-slate-700">Dismiss</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Critical: Worker execution rate -->
	<div class="relative flex gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
		<div class="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500"></div>
		<div class="flex items-start gap-4 w-full pl-2">
			<div class="flex items-center justify-center shrink-0 w-10 h-10 rounded-full bg-red-100 text-red-600">
				<span class="material-symbols-outlined">dns</span>
			</div>
			<div class="flex flex-col flex-1 min-w-0">
				<div class="flex items-center justify-between gap-2 mb-1">
					<h3 class="text-slate-900 font-semibold truncate text-base">Unusual Worker Execution Rate</h3>
					<span class="text-slate-500 text-xs shrink-0 font-medium">5 hours ago</span>
				</div>
				<p class="text-slate-600 text-sm line-clamp-2 mb-3">
					Worker <span class="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded text-slate-800">api-gateway</span>
					has triggered 50,000 requests in the last hour. This is 5x higher than historical average.
				</p>
				<div class="flex gap-3">
					<button class="text-primary text-sm font-medium hover:underline flex items-center gap-1">
						Investigate
						<span class="material-symbols-outlined !text-[16px]">arrow_forward</span>
					</button>
					<button class="text-slate-500 text-sm font-medium hover:text-slate-700">Dismiss</button>
				</div>
			</div>
		</div>
	</div>

	<!-- Info: New billing cycle (read/dimmed) -->
	<div class="relative flex gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-200 overflow-hidden opacity-75">
		<div class="flex items-start gap-4 w-full pl-2">
			<div class="flex items-center justify-center shrink-0 w-10 h-10 rounded-full bg-slate-200 text-slate-500">
				<span class="material-symbols-outlined">info</span>
			</div>
			<div class="flex flex-col flex-1 min-w-0">
				<div class="flex items-center justify-between gap-2 mb-1">
					<h3 class="text-slate-700 font-semibold truncate text-base">New Billing Cycle Started</h3>
					<span class="text-slate-400 text-xs shrink-0 font-medium">1 day ago</span>
				</div>
				<p class="text-slate-500 text-sm line-clamp-2">
					Your new billing cycle for October has begun. Budgets have been reset.
				</p>
			</div>
		</div>
	</div>
</div>

<div class="flex justify-center mt-6">
	<button class="px-6 py-2 rounded-full border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
		Load More
	</button>
</div>
