<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { api } from '$lib/api.js';
	import type { NotificationSeverity, NotificationType } from '@flarelens/shared';
	import type { PageData } from './$types.js';

	interface NotificationItem {
		id: string;
		type: NotificationType;
		title: string;
		body: string;
		severity: NotificationSeverity;
		link: string | null;
		read: 0 | 1;
		created_at: string;
	}

	let { data }: { data: PageData } = $props();

	let busyAction = $state<'mark-all' | 'archive-all' | string | null>(null);

	const notifications = $derived((data.notifications?.data ?? []) as NotificationItem[]);
	const unreadCount = $derived(notifications.filter((notification) => notification.read === 0).length);
	const criticalUnreadCount = $derived(
		notifications.filter(
			(notification) => notification.read === 0 && notification.severity === 'critical',
		).length,
	);
	const hasMore = $derived(
		(data.notifications?.page ?? 1) < (data.notifications?.total_pages ?? 1),
	);

	const severityAccent: Record<NotificationSeverity, string> = {
		critical: 'bg-red-500',
		warning: 'bg-primary',
		info: 'bg-slate-300',
	};

	const iconStyles: Record<NotificationSeverity, string> = {
		critical: 'bg-red-100 text-red-600',
		warning: 'bg-orange-100 text-primary',
		info: 'bg-slate-200 text-slate-500',
	};

	const cardStyles: Record<NotificationSeverity, string> = {
		critical:
			'bg-white shadow-sm border border-slate-200 hover:shadow-md transition-shadow opacity-100',
		warning:
			'bg-white shadow-sm border border-slate-200 hover:shadow-md transition-shadow opacity-100',
		info: 'bg-slate-50/50 border border-slate-200 opacity-75',
	};

	const titleStyles: Record<NotificationSeverity, string> = {
		critical: 'text-slate-900',
		warning: 'text-slate-900',
		info: 'text-slate-700',
	};

	const bodyStyles: Record<NotificationSeverity, string> = {
		critical: 'text-slate-600',
		warning: 'text-slate-600',
		info: 'text-slate-500',
	};

	const iconByType: Record<NotificationType, string> = {
		anomaly: 'trending_up',
		budget: 'pie_chart',
		billing: 'receipt_long',
		system: 'info',
		mitigation: 'dns',
	};

	function relativeTime(iso: string): string {
		const diff = Date.now() - new Date(iso).getTime();
		const minutes = Math.floor(diff / 60000);
		if (minutes < 1) return 'just now';
		if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
		const days = Math.floor(hours / 24);
		return `${days} day${days === 1 ? '' : 's'} ago`;
	}

	function summaryLine(): string {
		if (criticalUnreadCount > 0) {
			return `You have ${criticalUnreadCount} unread critical notification${criticalUnreadCount === 1 ? '' : 's'}.`;
		}
		if (unreadCount > 0) {
			return `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}.`;
		}
		return 'All notifications are up to date.';
	}

	async function refreshNotifications() {
		await invalidateAll();
	}

	async function markAllRead() {
		busyAction = 'mark-all';
		try {
			await api.post('/notifications/mark-all-read');
			await refreshNotifications();
		} finally {
			busyAction = null;
		}
	}

	async function archiveAll() {
		busyAction = 'archive-all';
		try {
			await api.post('/notifications/archive-all');
			await refreshNotifications();
		} finally {
			busyAction = null;
		}
	}

	async function markRead(id: string) {
		busyAction = id;
		try {
			await api.patch(`/notifications/${id}/read`);
			await refreshNotifications();
		} finally {
			busyAction = null;
		}
	}
</script>

<div class="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
	<div class="flex flex-col gap-1">
		<h1 class="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Inbox</h1>
		<p class="text-sm text-slate-500">{summaryLine()}</p>
	</div>
	<div class="flex gap-3">
		<button
			type="button"
			class="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
			onclick={markAllRead}
			disabled={notifications.length === 0 || unreadCount === 0 || busyAction !== null}
		>
			<span class="material-symbols-outlined !text-[20px]">done_all</span>
			Mark all as read
		</button>
		<button
			type="button"
			class="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
			onclick={archiveAll}
			disabled={notifications.length === 0 || busyAction !== null}
		>
			<span class="material-symbols-outlined !text-[20px]">archive</span>
			Archive All
		</button>
	</div>
</div>

{#if notifications.length === 0}
	<div class="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
		No notifications yet.
	</div>
{:else}
	<div class="flex flex-col gap-4">
		{#each notifications as notification}
			<div
				class={`relative flex gap-4 overflow-hidden rounded-xl p-4 ${cardStyles[notification.severity]}`}
			>
				<div class={`absolute left-0 top-0 bottom-0 w-1.5 ${severityAccent[notification.severity]}`}></div>
				<div class="flex w-full items-start gap-4 pl-2">
					<div
						class={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconStyles[notification.severity]}`}
					>
						<span class="material-symbols-outlined">
							{iconByType[notification.type] ?? 'notifications'}
						</span>
					</div>
					<div class="flex min-w-0 flex-1 flex-col">
						<div class="mb-1 flex items-center justify-between gap-2">
							<h3 class={`truncate text-base font-semibold ${titleStyles[notification.severity]}`}>
								{notification.title}
							</h3>
							<span class="shrink-0 text-xs font-medium text-slate-500">
								{relativeTime(notification.created_at)}
							</span>
						</div>
						<p class={`mb-3 line-clamp-2 text-sm ${bodyStyles[notification.severity]}`}>
							{notification.body}
						</p>
						<div class="flex gap-3">
							{#if notification.link}
								<a
									href={notification.link}
									class="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
								>
									View Details
									<span class="material-symbols-outlined !text-[16px]">arrow_forward</span>
								</a>
							{/if}
							{#if notification.read === 0}
								<button
									type="button"
									class="text-sm font-medium text-slate-500 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
									onclick={() => markRead(notification.id)}
									disabled={busyAction !== null}
								>
									Mark as read
								</button>
							{/if}
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>
{/if}

{#if hasMore}
	<div class="mt-6 flex justify-center">
		<div class="rounded-full border border-slate-300 px-6 py-2 text-sm font-medium text-slate-500">
			More notifications are available in the API but pagination is not wired on this page yet.
		</div>
	</div>
{/if}
