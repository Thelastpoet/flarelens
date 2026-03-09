<script lang="ts">
import { page } from '$app/stores';
import Icon from '$lib/components/ui/Icon.svelte';
import { account, currentUser } from '$lib/data/mock';

type NavItem = { label: string; href: string; icon: string; badge?: number };
type Props = { items: NavItem[] };
let { items }: Props = $props();
</script>

<aside class="flex flex-col w-56 min-h-screen bg-white border-r border-gray-200">
	<!-- Account -->
	<div class="px-4 py-5 border-b border-gray-100">
		<div class="flex items-center gap-2">
			<div class="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-100">
				<span class="text-brand-600 text-sm font-bold">🛡️</span>
			</div>
			<div>
				<div class="text-sm font-semibold text-navy-900">Budget Guard</div>
				<div class="text-xs text-gray-500">{account.subtitle}</div>
			</div>
		</div>
	</div>

	<!-- Account selector -->
	<div class="px-4 py-3 border-b border-gray-100">
		<div class="flex items-center gap-2">
			<div class="flex items-center justify-center w-7 h-7 rounded bg-brand-50 text-brand-600">
				<span class="text-xs font-bold">CF</span>
			</div>
			<div class="flex-1 min-w-0">
				<div class="text-sm font-medium text-navy-800 truncate">{account.name}</div>
				<div class="text-xs text-gray-400">{account.subtitle}</div>
			</div>
			<Icon name="chevron-down" class="w-4 h-4 text-gray-400" />
		</div>
	</div>

	<!-- Navigation -->
	<nav class="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
		{#each items as item}
			{@const active = $page.url.pathname === item.href}
			<a
				href={item.href}
				class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
					{active ? 'bg-brand-50 text-brand-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}"
			>
				<Icon name={item.icon} class="w-5 h-5 {active ? 'text-brand-500' : 'text-gray-400'}" />
				<span class="flex-1">{item.label}</span>
				{#if item.badge}
					<span class="flex items-center justify-center w-5 h-5 rounded-full bg-brand-500 text-white text-xs font-medium">
						{item.badge}
					</span>
				{/if}
			</a>
		{/each}
	</nav>

	<!-- User -->
	<div class="px-4 py-4 border-t border-gray-100">
		<div class="flex items-center gap-3">
			<div class="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-600 text-xs font-semibold">
				{currentUser.initials || '?'}
			</div>
			<div class="flex-1 min-w-0">
				<div class="text-sm font-medium text-navy-800 truncate">{currentUser.name}</div>
				<div class="text-xs text-gray-400 truncate">{currentUser.email}</div>
			</div>
		</div>
	</div>
</aside>
