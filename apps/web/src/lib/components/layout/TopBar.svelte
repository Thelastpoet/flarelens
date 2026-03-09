<script lang="ts">
import Icon from '$lib/components/ui/Icon.svelte';
import { notifications } from '$lib/data/mock';

let { title = '' }: { title?: string } = $props();
const unread = notifications.filter((n) => n.severity !== 'info').length;
</script>

<header class="flex items-center h-14 px-6 bg-white border-b border-gray-200 gap-4">
	<!-- Search -->
	<div class="flex items-center flex-1 max-w-xs gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-400">
		<Icon name="search" class="w-4 h-4" />
		<span>Search resources...</span>
	</div>

	<div class="flex-1"></div>

	<!-- Notification bell -->
	<button class="relative p-2 rounded-lg text-gray-500 hover:bg-gray-50">
		<Icon name="bell" class="w-5 h-5" />
		{#if unread > 0}
			<span class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500"></span>
		{/if}
	</button>

	<!-- User avatar -->
	<div class="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-600 text-sm font-semibold cursor-pointer">
		JD
	</div>
</header>
