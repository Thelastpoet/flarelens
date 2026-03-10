<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types.js';

	type ActionType = 'create' | 'update' | 'delete' | 'auth' | 'system';

	interface LogEntry {
		id: string;
		user_email: string | null;
		action: ActionType;
		description: string;
		ip_address: string | null;
		entity_type: string;
		created_at: string;
	}

	let { data }: { data: PageData } = $props();

	let selectedAction = $state('' as '' | ActionType);
	let fromDate = $state('');
	let toDate = $state('');

	$effect(() => {
		selectedAction = (data.filters?.action ?? '') as '' | ActionType;
		fromDate = data.filters?.from ?? '';
		toDate = data.filters?.to ?? '';
	});

	const actionStyles: Record<'Update' | 'Create' | 'Delete' | 'Auth' | 'System', string> = {
	Update:
		'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 ring-1 ring-inset ring-amber-600/20',
	Create:
		'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 ring-1 ring-inset ring-green-600/20',
	Delete:
		'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 ring-1 ring-inset ring-red-600/10',
	Auth: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 ring-1 ring-inset ring-blue-700/10',
	System:
		'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 ring-1 ring-inset ring-slate-500/20',
};

	const logEntries = $derived((data.logs ?? []) as LogEntry[]);
	const currentPage = $derived(data.page ?? 1);
	const totalResults = $derived(data.total ?? 0);
	const totalPages = $derived(data.totalPages ?? 1);

	function titleAction(action: ActionType): 'Update' | 'Create' | 'Delete' | 'Auth' | 'System' {
		return action === 'update'
			? 'Update'
			: action === 'create'
				? 'Create'
				: action === 'delete'
					? 'Delete'
					: action === 'auth'
						? 'Auth'
						: 'System';
	}

	function formatTimestamp(iso: string): string {
		return new Date(iso).toLocaleString();
	}

	function userInitial(email: string | null): string {
		if (!email) return '';
		return (email[0] ?? '?').toUpperCase();
	}

	function userBg(email: string | null): string {
		if (!email) return '';
		const colors = [
			'bg-primary/20 text-primary',
			'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
			'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
			'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
		];
		return colors[email.length % colors.length]!;
	}

	async function applyFilters(page = 1) {
		const params = new URLSearchParams();
		if (selectedAction) params.set('action', selectedAction);
		if (fromDate) params.set('from', fromDate);
		if (toDate) params.set('to', toDate);
		if (page > 1) params.set('page', String(page));
		await goto(`/audit?${params.toString()}`, { invalidateAll: true });
	}

	function exportHref(): string {
		const params = new URLSearchParams();
		if (selectedAction) params.set('action', selectedAction);
		if (fromDate) params.set('from', fromDate);
		if (toDate) params.set('to', toDate);
		return `/api/audit-logs/export?${params.toString()}`;
	}
</script>

<div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
  <div class="flex flex-col gap-2">
    <h1 class="text-slate-900 dark:text-slate-100 tracking-light text-3xl font-bold leading-tight">Security &amp; Audit Log</h1>
    <p class="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal max-w-2xl">Track team actions and system changes for compliance and transparency across your infrastructure.</p>
  </div>
  <div class="flex flex-wrap gap-3 w-full md:w-auto">
    <div class="flex h-10 shrink-0 items-center gap-x-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4">
      <span class="material-symbols-outlined text-slate-500 text-sm">person</span>
      <p class="text-slate-700 dark:text-slate-300 text-sm font-medium leading-normal">All Users</p>
    </div>
    <label class="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4">
      <span class="material-symbols-outlined text-slate-500 text-sm">filter_list</span>
      <select bind:value={selectedAction} class="bg-transparent text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none">
        <option value="">Action: Any</option>
        <option value="create">Create</option>
        <option value="update">Update</option>
        <option value="delete">Delete</option>
        <option value="auth">Auth</option>
        <option value="system">System</option>
      </select>
    </label>
    <label class="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4">
      <span class="material-symbols-outlined text-slate-500 text-sm">calendar_today</span>
      <input bind:value={fromDate} type="date" class="bg-transparent text-sm text-slate-700 focus:outline-none" />
      <span class="text-slate-400 text-xs">to</span>
      <input bind:value={toDate} type="date" class="bg-transparent text-sm text-slate-700 focus:outline-none" />
    </label>
    <button type="button" onclick={() => applyFilters()} class="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-white border border-slate-200 px-4 hover:bg-slate-50 transition-colors">
      <span class="material-symbols-outlined text-slate-500 text-sm">search</span>
      <p class="text-slate-700 text-sm font-medium leading-normal">Apply</p>
    </button>
    <a href={exportHref()} class="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-primary text-white px-4 hover:bg-primary/90 transition-colors ml-auto md:ml-0">
      <span class="material-symbols-outlined text-sm">download</span>
      <p class="text-sm font-medium leading-normal">Export CSV</p>
    </a>
  </div>
</div>

<div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
  <div class="overflow-x-auto">
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
          <th class="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Timestamp</th>
          <th class="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">User</th>
          <th class="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Action</th>
          <th class="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">IP Address</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-200 dark:divide-slate-800">
        {#if logEntries.length === 0}
          <tr>
            <td colspan="4" class="px-6 py-10 text-center text-sm text-slate-500">No audit log entries match the current filters.</td>
          </tr>
        {:else}
        {#each logEntries as entry}
          <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[16px]">schedule</span>
                {formatTimestamp(entry.created_at)}
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium {entry.user_email === null ? 'text-slate-600 dark:text-slate-400 italic' : 'text-slate-900 dark:text-slate-100'}">
              <div class="flex items-center gap-2">
                {#if entry.user_email === null}
                  <span class="material-symbols-outlined text-[18px]">smart_toy</span>
                {:else}
                  <div class="size-6 rounded-full {userBg(entry.user_email)} flex items-center justify-center text-xs font-bold">{userInitial(entry.user_email)}</div>
                {/if}
                {entry.user_email ?? 'System Automated'}
              </div>
            </td>
            <td class="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
              <span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium mr-2 {actionStyles[titleAction(entry.action)]}">{titleAction(entry.action)}</span>
              {entry.description}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 font-mono text-xs">
              {entry.ip_address ?? '-'}
            </td>
          </tr>
        {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <!-- Pagination -->
  <div class="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3">
    <p class="text-sm text-slate-500 dark:text-slate-400">Showing 1 to {logEntries.length} of {totalResults} results</p>
    <div class="flex items-center gap-1">
      <button type="button" onclick={() => applyFilters(currentPage - 1)} disabled={currentPage <= 1} class="flex size-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 disabled:cursor-not-allowed">
        <span class="material-symbols-outlined text-sm">chevron_left</span>
      </button>
      {#each Array.from({ length: Math.min(totalPages, 3) }, (_, index) => index + 1) as page}
        <button
          type="button"
          onclick={() => applyFilters(page)}
          class="flex size-8 items-center justify-center rounded-lg text-sm font-medium {currentPage === page ? 'bg-primary text-white' : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors'}"
        >
          {page}
        </button>
      {/each}
      {#if totalPages > 3}
        <span class="flex size-8 items-center justify-center text-slate-500">...</span>
        <button type="button" onclick={() => applyFilters(totalPages)} class="flex size-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors">{totalPages}</button>
      {/if}
      <button type="button" onclick={() => applyFilters(currentPage + 1)} disabled={currentPage >= totalPages} class="flex size-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:cursor-not-allowed disabled:text-slate-400">
        <span class="material-symbols-outlined text-sm">chevron_right</span>
      </button>
    </div>
  </div>
</div>
