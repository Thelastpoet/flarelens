<script lang="ts">
import { page } from '$app/stores';

let { children }: { children: import('svelte').Snippet } = $props();

const steps = [
	{ label: 'Connect Cloudflare', href: '/onboarding/connect' },
	{ label: 'Select Zones', href: '/onboarding/zones' },
	{ label: 'All Done!', href: '/onboarding/success' },
];

const currentStep = $derived(
	steps.findIndex((s) => $page.url.pathname.includes(s.href.split('/').pop() ?? '')) + 1 || 1,
);
</script>

<div class="min-h-screen bg-gray-50 flex flex-col">
	<!-- Top bar -->
	<header class="h-14 bg-white border-b border-gray-200 flex items-center px-8">
		<div class="flex items-center gap-2">
			<div class="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-white text-xs font-bold">🛡️</div>
			<span class="text-sm font-semibold text-slate-900">FlareLens</span>
		</div>
	</header>

	<div class="flex-1 flex flex-col items-center justify-center px-4 py-12">
		<!-- Step indicator -->
		<div class="flex items-center gap-2 mb-10">
			{#each steps as step, i}
				{@const stepNum = i + 1}
				{@const done = stepNum < currentStep}
				{@const active = stepNum === currentStep}
				<div class="flex items-center gap-2">
					<div class="flex items-center gap-2">
						<div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold {done ? 'bg-green-500 text-white' : active ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'}">
							{done ? '✓' : stepNum}
						</div>
						<span class="text-sm {active ? 'font-semibold text-slate-900' : 'text-gray-400'}">{step.label}</span>
					</div>
					{#if i < steps.length - 1}
						<div class="w-12 h-px bg-gray-200 mx-2"></div>
					{/if}
				</div>
			{/each}
		</div>

		{@render children()}
	</div>
</div>
