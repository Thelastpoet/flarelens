<script lang="ts">
interface Notification {
	id: string;
	title: string;
	message?: string;
	body?: string;
	is_read?: 0 | 1;
	read?: 0 | 1;
	created_at: string;
}

interface Props {
	notifications: Notification[];
	unreadCount: number;
}

let { notifications, unreadCount }: Props = $props();

function relativeTime(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return 'just now';
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	return `${Math.floor(hours / 24)}d ago`;
}

function isUnread(n: Notification): boolean {
	const flag = n.is_read ?? n.read;
	return flag === 0;
}

async function markAllRead() {
	await fetch('/api/notifications/mark-all-read', {
		method: 'POST',
		credentials: 'include',
	});
	// Reload to reflect updated state
	window.location.reload();
}

const visible = $derived(notifications.slice(0, 10));
</script>

<div class="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden">
	<div class="flex items-center justify-between px-4 py-3 border-b border-slate-100">
		<span class="text-sm font-semibold text-slate-900">
			Notifications
			{#if unreadCount > 0}
				<span class="ml-1.5 text-xs font-bold text-orange-600">({unreadCount})</span>
			{/if}
		</span>
		{#if unreadCount > 0}
			<button
				onclick={markAllRead}
				class="text-xs text-gray-500 hover:text-orange-600 transition-colors"
			>
				Mark all read
			</button>
		{/if}
	</div>

	{#if visible.length === 0}
		<div class="px-4 py-8 text-center text-sm text-gray-400">No notifications</div>
	{:else}
		<ul class="divide-y divide-slate-50 max-h-80 overflow-y-auto">
			{#each visible as n}
				<li class="px-4 py-3 {isUnread(n) ? 'bg-orange-50/60' : 'bg-white'} hover:bg-gray-50 transition-colors">
					<div class="flex items-start justify-between gap-2">
						<div class="flex-1 min-w-0">
							<p class="text-sm font-medium text-slate-800 truncate">{n.title}</p>
							{#if n.message ?? n.body}
								<p class="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message ?? n.body}</p>
							{/if}
						</div>
						<span class="text-[10px] text-gray-400 whitespace-nowrap shrink-0 mt-0.5">{relativeTime(n.created_at)}</span>
					</div>
					{#if isUnread(n)}
						<span class="inline-block mt-1 w-1.5 h-1.5 rounded-full bg-orange-500"></span>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>
