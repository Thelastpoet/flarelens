<script lang="ts">
	import { page } from '$app/stores';

	let { children }: { children: import('svelte').Snippet } = $props();

	const steps = [
		{ label: 'Connect Cloudflare', href: '/onboarding/connect' },
		{ label: 'Select Resources', href: '/onboarding/zones' },
		{ label: 'Complete Setup', href: '/onboarding/success' },
	];

	const currentStep = $derived(
		steps.findIndex((step) => $page.url.pathname === step.href) + 1 || 1,
	);
</script>

<div class="min-h-screen bg-gray-50 flex flex-col">
	<header class="h-14 bg-white border-b border-gray-200 flex items-center px-8">
		<div class="flex items-center gap-2">
			<div class="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-white">
				<span class="material-symbols-outlined text-base">shield</span>
			</div>
			<span class="text-sm font-semibold text-slate-900">FlareLens</span>
		</div>
	</header>

	<div class="flex-1 flex flex-col items-center justify-center px-4 py-12">
		<div class="flex items-center gap-2 mb-10">
			{#each steps as step, i}
				{@const stepNum = i + 1}
				{@const done = stepNum < currentStep}
				{@const active = stepNum === currentStep}
				<div class="flex items-center gap-2">
					<div class="flex items-center gap-2">
						<div
							class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold {done
								? 'bg-green-500 text-white'
								: active
									? 'bg-orange-500 text-white'
									: 'bg-gray-200 text-gray-500'}"
						>
							{#if done}
								<span class="material-symbols-outlined text-sm">check</span>
							{:else}
								{stepNum}
							{/if}
						</div>
						<span class="text-sm {active ? 'font-semibold text-slate-900' : 'text-gray-400'}">
							{step.label}
						</span>
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
