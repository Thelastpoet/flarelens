<script lang="ts">
type ActionType = 'Update' | 'Create' | 'Delete' | 'Auth' | 'System';

type LogEntry = {
	timestamp: string;
	userInitial: string;
	userDisplay: string;
	userBg: string;
	isSystem: boolean;
	action: ActionType;
	description: string;
	ip: string;
};

const actionStyles: Record<ActionType, string> = {
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

const logEntries = $state<LogEntry[]>([
	{
		timestamp: 'Oct 24, 2023 14:32:15',
		userInitial: 'A',
		userDisplay: 'alice@example.com',
		userBg: 'bg-primary/20 text-primary',
		isSystem: false,
		action: 'Update',
		description: "Changed Rule Threshold for 'Bandwidth Spike'",
		ip: '192.168.1.105',
	},
	{
		timestamp: 'Oct 24, 2023 11:15:02',
		userInitial: 'B',
		userDisplay: 'bob@example.com',
		userBg: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
		isSystem: false,
		action: 'Update',
		description: 'Updated Slack Integration settings',
		ip: '10.0.0.42',
	},
	{
		timestamp: 'Oct 23, 2023 09:45:00',
		userInitial: '',
		userDisplay: 'System Automated',
		userBg: '',
		isSystem: true,
		action: 'System',
		description: 'Generated Weekly Cost Report',
		ip: '127.0.0.1',
	},
	{
		timestamp: 'Oct 22, 2023 16:20:45',
		userInitial: 'A',
		userDisplay: 'alice@example.com',
		userBg: 'bg-primary/20 text-primary',
		isSystem: false,
		action: 'Create',
		description: "Created new rule 'API Limits Exceeded'",
		ip: '192.168.1.105',
	},
	{
		timestamp: 'Oct 21, 2023 10:05:12',
		userInitial: 'C',
		userDisplay: 'charlie@example.com',
		userBg: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400',
		isSystem: false,
		action: 'Auth',
		description: 'Successful login via SSO',
		ip: '172.16.0.50',
	},
	{
		timestamp: 'Oct 20, 2023 15:30:22',
		userInitial: 'B',
		userDisplay: 'bob@example.com',
		userBg: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
		isSystem: false,
		action: 'Delete',
		description: 'Deleted deprecated billing alert',
		ip: '10.0.0.42',
	},
]);

let currentPage = $state(1);
const totalResults = 97;
</script>

<div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
  <div class="flex flex-col gap-2">
    <h1 class="text-slate-900 dark:text-slate-100 tracking-light text-3xl font-bold leading-tight">Security &amp; Audit Log</h1>
    <p class="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal max-w-2xl">Track team actions and system changes for compliance and transparency across your infrastructure.</p>
  </div>
  <div class="flex flex-wrap gap-3 w-full md:w-auto">
    <button class="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
      <span class="material-symbols-outlined text-slate-500 text-sm">person</span>
      <p class="text-slate-700 dark:text-slate-300 text-sm font-medium leading-normal">All Users</p>
      <span class="material-symbols-outlined text-slate-500 text-sm ml-1">expand_more</span>
    </button>
    <button class="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
      <span class="material-symbols-outlined text-slate-500 text-sm">filter_list</span>
      <p class="text-slate-700 dark:text-slate-300 text-sm font-medium leading-normal">Action: Any</p>
      <span class="material-symbols-outlined text-slate-500 text-sm ml-1">expand_more</span>
    </button>
    <button class="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
      <span class="material-symbols-outlined text-slate-500 text-sm">calendar_today</span>
      <p class="text-slate-700 dark:text-slate-300 text-sm font-medium leading-normal">Last 30 Days</p>
      <span class="material-symbols-outlined text-slate-500 text-sm ml-1">expand_more</span>
    </button>
    <button class="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-primary text-white px-4 hover:bg-primary/90 transition-colors ml-auto md:ml-0">
      <span class="material-symbols-outlined text-sm">download</span>
      <p class="text-sm font-medium leading-normal">Export CSV</p>
    </button>
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
        {#each logEntries as entry}
          <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[16px]">schedule</span>
                {entry.timestamp}
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium {entry.isSystem ? 'text-slate-600 dark:text-slate-400 italic' : 'text-slate-900 dark:text-slate-100'}">
              <div class="flex items-center gap-2">
                {#if entry.isSystem}
                  <span class="material-symbols-outlined text-[18px]">smart_toy</span>
                {:else}
                  <div class="size-6 rounded-full {entry.userBg} flex items-center justify-center text-xs font-bold">{entry.userInitial}</div>
                {/if}
                {entry.userDisplay}
              </div>
            </td>
            <td class="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
              <span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium mr-2 {actionStyles[entry.action]}">{entry.action}</span>
              {entry.description}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 font-mono text-xs">
              {entry.ip}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Pagination -->
  <div class="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3">
    <p class="text-sm text-slate-500 dark:text-slate-400">Showing 1 to {logEntries.length} of {totalResults} results</p>
    <div class="flex items-center gap-1">
      <button class="flex size-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed">
        <span class="material-symbols-outlined text-sm">chevron_left</span>
      </button>
      {#each [1, 2, 3] as page}
        <button
          onclick={() => (currentPage = page)}
          class="flex size-8 items-center justify-center rounded-lg text-sm font-medium {currentPage === page ? 'bg-primary text-white' : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors'}"
        >
          {page}
        </button>
      {/each}
      <span class="flex size-8 items-center justify-center text-slate-500">...</span>
      <button class="flex size-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors">17</button>
      <button class="flex size-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
        <span class="material-symbols-outlined text-sm">chevron_right</span>
      </button>
    </div>
  </div>
</div>
