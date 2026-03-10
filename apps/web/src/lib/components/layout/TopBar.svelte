<script lang="ts">
import NotificationBadge from '$lib/components/notifications/NotificationBadge.svelte';
import NotificationInbox from '$lib/components/notifications/NotificationInbox.svelte';
import Icon from '$lib/components/ui/Icon.svelte';

let { title = '' }: { title?: string } = $props();

let notificationCount = $state(0);
let notifications = $state<
	{ id: string; title: string; body: string; read: 0 | 1; created_at: string }[]
>([]);
let inboxOpen = $state(false);

$effect(() => {
	fetch('/api/notifications?read=false&per_page=10', { credentials: 'include' })
		.then((r) => r.json())
		.then((raw) => {
			const data = raw as { data?: typeof notifications; total?: number };
			notifications = data.data ?? [];
			notificationCount = data.total ?? notifications.length;
		})
		.catch(() => {
			notificationCount = 0;
		});
});
</script>

<header class="flex items-center h-14 px-6 bg-white border-b border-gray-200 gap-4">
	<!-- Search -->
	<div class="flex items-center flex-1 max-w-xs gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-400">
		<Icon name="search" class="w-4 h-4" />
		<span>Search resources...</span>
	</div>

	<div class="flex-1"></div>

	<!-- Notification bell -->
	<div class="relative">
		<button
			class="relative p-2 rounded-lg text-gray-500 hover:bg-gray-50"
			onclick={() => inboxOpen = !inboxOpen}
			aria-label="Toggle notifications"
		>
			<Icon name="bell" class="w-5 h-5" />
			<NotificationBadge count={notificationCount} />
		</button>

		{#if inboxOpen}
			<NotificationInbox {notifications} unreadCount={notificationCount} />
			<!-- Backdrop to close inbox -->
			<button
				class="fixed inset-0 z-40"
				aria-label="Close notifications"
				onclick={() => inboxOpen = false}
			></button>
		{/if}
	</div>

	<!-- User avatar -->
	<div class="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-600 text-sm font-semibold cursor-pointer">
		JD
	</div>
</header>
