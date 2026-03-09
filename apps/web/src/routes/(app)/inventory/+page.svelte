<script lang="ts">
type ResourceStatus = 'active' | 'paused';

type Resource = {
	name: string;
	id: string;
	type: string;
	status: ResourceStatus;
	rules: number;
	iconBg: string;
	iconColor: string;
	icon: string;
};

let search = $state('');

const resources = $state<Resource[]>([
	{
		name: 'example.com',
		id: 'z1a2b3c4...',
		type: 'Zone',
		status: 'active',
		rules: 3,
		iconBg: 'bg-blue-100',
		iconColor: 'text-blue-600',
		icon: 'language',
	},
	{
		name: 'api-worker',
		id: 'w9x8y7z6...',
		type: 'Worker',
		status: 'active',
		rules: 2,
		iconBg: 'bg-orange-100',
		iconColor: 'text-orange-600',
		icon: 'code',
	},
	{
		name: 'images-bucket',
		id: 'r2b5n6m7...',
		type: 'R2 Bucket',
		status: 'paused',
		rules: 0,
		iconBg: 'bg-purple-100',
		iconColor: 'text-purple-600',
		icon: 'cloud',
	},
	{
		name: 'session-cache',
		id: 'kv1k2j3h...',
		type: 'KV Namespace',
		status: 'active',
		rules: 1,
		iconBg: 'bg-indigo-100',
		iconColor: 'text-indigo-600',
		icon: 'storage',
	},
]);

let filtered = $derived(
	search
		? resources.filter(
				(r) =>
					r.name.toLowerCase().includes(search.toLowerCase()) ||
					r.type.toLowerCase().includes(search.toLowerCase()),
			)
		: resources,
);
</script>

<div class="max-w-6xl mx-auto flex flex-col gap-6">
  <!-- Page header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-slate-900">Infrastructure Inventory</h1>
      <p class="text-sm text-slate-500 mt-1">Manage and monitor all detected Cloudflare resources.</p>
    </div>
    <button class="flex items-center justify-center rounded-md px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm">
      <span class="material-symbols-outlined text-sm mr-2">add</span>
      Add Resource manually
    </button>
  </div>

  <!-- Filters -->
  <div class="flex gap-4 items-center">
    <div class="flex w-80 items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
      <span class="material-symbols-outlined text-slate-400 text-xl mr-2">search</span>
      <input
        bind:value={search}
        class="w-full border-none p-0 text-sm focus:ring-0 text-slate-900 placeholder:text-slate-400"
        placeholder="Search resources..."
        type="text"
      />
    </div>
    <button class="flex items-center gap-2 px-3 py-1.5 border border-slate-200 bg-white rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm">
      <span class="material-symbols-outlined text-sm">filter_list</span>
      Filter
    </button>
    <button class="flex items-center gap-2 px-3 py-1.5 border border-slate-200 bg-white rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm">
      <span class="material-symbols-outlined text-sm">sort</span>
      Sort
    </button>
  </div>

  <!-- Table -->
  <div class="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
    <table class="w-full text-left border-collapse">
      <thead>
        <tr class="bg-slate-50 border-b border-slate-200">
          <th class="px-6 py-3 text-slate-500 text-xs font-semibold uppercase tracking-wider">Resource Name</th>
          <th class="px-6 py-3 text-slate-500 text-xs font-semibold uppercase tracking-wider">Type</th>
          <th class="px-6 py-3 text-slate-500 text-xs font-semibold uppercase tracking-wider">Monitoring Status</th>
          <th class="px-6 py-3 text-slate-500 text-xs font-semibold uppercase tracking-wider">Active Rules</th>
          <th class="px-6 py-3 text-slate-500 text-xs font-semibold uppercase tracking-wider text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-200">
        {#each filtered as resource}
          <tr class="hover:bg-slate-50 transition-colors group">
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="{resource.iconBg} {resource.iconColor} p-1.5 rounded">
                  <span class="material-symbols-outlined text-lg">{resource.icon}</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-sm font-medium text-slate-900">{resource.name}</span>
                  <span class="text-xs text-slate-500">ID: {resource.id}</span>
                </div>
              </div>
            </td>
            <td class="px-6 py-4">
              <span class="inline-flex items-center rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 border border-slate-200">
                {resource.type}
              </span>
            </td>
            <td class="px-6 py-4">
              {#if resource.status === 'active'}
                <div class="flex items-center gap-1.5 text-sm">
                  <span class="relative flex h-2 w-2">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span class="text-slate-700 font-medium">Active</span>
                </div>
              {:else}
                <div class="flex items-center gap-1.5 text-sm">
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-slate-400"></span>
                  <span class="text-slate-500 font-medium">Paused</span>
                </div>
              {/if}
            </td>
            <td class="px-6 py-4">
              <span class="inline-flex items-center justify-center {resource.rules > 0 ? 'bg-slate-100 text-slate-700' : 'bg-slate-50 text-slate-400'} border border-slate-200 rounded-full h-6 w-6 text-xs font-medium">
                {resource.rules}
              </span>
            </td>
            <td class="px-6 py-4 text-right">
              <button class="text-slate-400 hover:text-slate-700 transition-colors p-1">
                <span class="material-symbols-outlined text-lg">more_vert</span>
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
    <div class="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3">
      <span class="text-sm text-slate-500">Showing 1 to {filtered.length} of {filtered.length} results</span>
      <div class="flex gap-1">
        <button class="px-2 py-1 border border-slate-200 rounded text-slate-400 cursor-not-allowed text-sm">Previous</button>
        <button class="px-2 py-1 border border-slate-200 rounded text-slate-400 cursor-not-allowed text-sm">Next</button>
      </div>
    </div>
  </div>
</div>
