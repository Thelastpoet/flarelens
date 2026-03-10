<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { api } from '$lib/api.js';
	import type { PageData } from './$types.js';

	type ResourceStatus = 'active' | 'paused';
	type ResourceType = 'zone' | 'worker' | 'r2_bucket' | 'kv_namespace' | 'd1_database';
	type FilterMode = 'all' | ResourceStatus;
	type SortMode = 'name' | 'type' | 'rules';

	interface ResourceRow {
		id: string;
		name: string;
		type: ResourceType;
		monitoring_status: ResourceStatus;
		cf_resource_id: string;
	}

	interface RuleRecord {
		id: string;
		resource_id: string | null;
		enabled: 0 | 1;
	}

	let { data }: { data: PageData } = $props();

	let search = $state('');
	let filterMode = $state<FilterMode>('all');
	let sortMode = $state<SortMode>('name');
	let openMenuId = $state<string | null>(null);
	let busyAction = $state<'sync' | string | null>(null);

	const resources = $derived((data.resources ?? []) as ResourceRow[]);
	const rules = $derived((data.rules ?? []) as RuleRecord[]);

	const typeMeta: Record<
		ResourceType,
		{ label: string; iconBg: string; iconColor: string; icon: string }
	> = {
		zone: {
			label: 'Zone',
			iconBg: 'bg-blue-100',
			iconColor: 'text-blue-600',
			icon: 'language',
		},
		worker: {
			label: 'Worker',
			iconBg: 'bg-orange-100',
			iconColor: 'text-orange-600',
			icon: 'code',
		},
		r2_bucket: {
			label: 'R2 Bucket',
			iconBg: 'bg-purple-100',
			iconColor: 'text-purple-600',
			icon: 'cloud',
		},
		kv_namespace: {
			label: 'KV Namespace',
			iconBg: 'bg-indigo-100',
			iconColor: 'text-indigo-600',
			icon: 'storage',
		},
		d1_database: {
			label: 'D1 Database',
			iconBg: 'bg-emerald-100',
			iconColor: 'text-emerald-700',
			icon: 'database',
		},
	};

	function ruleCount(resourceId: string): number {
		return rules.filter((rule) => rule.resource_id === resourceId && rule.enabled === 1).length;
	}

	const filtered = $derived.by(() => {
		const searchValue = search.trim().toLowerCase();
		const base = resources
			.filter((resource) => filterMode === 'all' || resource.monitoring_status === filterMode)
			.filter((resource) => {
				const typeLabel = typeMeta[resource.type]?.label ?? resource.type;
				return (
					searchValue.length === 0 ||
					resource.name.toLowerCase().includes(searchValue) ||
					typeLabel.toLowerCase().includes(searchValue)
				);
			})
			.map((resource) => ({
				...resource,
				typeLabel: typeMeta[resource.type]?.label ?? resource.type,
				iconBg: typeMeta[resource.type]?.iconBg ?? 'bg-slate-100',
				iconColor: typeMeta[resource.type]?.iconColor ?? 'text-slate-600',
				icon: typeMeta[resource.type]?.icon ?? 'deployed_code',
				rules: ruleCount(resource.id),
			}));

		return [...base].sort((left, right) => {
			if (sortMode === 'type') return left.typeLabel.localeCompare(right.typeLabel);
			if (sortMode === 'rules') return right.rules - left.rules || left.name.localeCompare(right.name);
			return left.name.localeCompare(right.name);
		});
	});

	function nextFilterMode() {
		filterMode = filterMode === 'all' ? 'active' : filterMode === 'active' ? 'paused' : 'all';
	}

	function nextSortMode() {
		sortMode = sortMode === 'name' ? 'type' : sortMode === 'type' ? 'rules' : 'name';
	}

	function filterLabel(): string {
		return filterMode === 'all' ? 'All resources' : filterMode === 'active' ? 'Active only' : 'Paused only';
	}

	function sortLabel(): string {
		return sortMode === 'name' ? 'Name' : sortMode === 'type' ? 'Type' : 'Active rules';
	}

	async function refreshInventory() {
		openMenuId = null;
		await invalidateAll();
	}

	async function syncResources() {
		busyAction = 'sync';
		try {
			await api.post('/resources/sync');
			await refreshInventory();
		} finally {
			busyAction = null;
		}
	}

	async function setMonitoringStatus(resourceId: string, status: ResourceStatus) {
		busyAction = resourceId;
		try {
			await api.patch(`/resources/${resourceId}`, { monitoring_status: status });
			await refreshInventory();
		} finally {
			busyAction = null;
		}
	}

	async function removeResource(resourceId: string) {
		busyAction = resourceId;
		try {
			await api.delete(`/resources/${resourceId}`);
			await refreshInventory();
		} finally {
			busyAction = null;
		}
	}
</script>

<div class="max-w-6xl mx-auto flex flex-col gap-6">
  <!-- Page header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-slate-900">Infrastructure Inventory</h1>
      <p class="text-sm text-slate-500 mt-1">Manage and monitor all detected Cloudflare resources.</p>
    </div>
    <button
      type="button"
      class="flex items-center justify-center rounded-md px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
      onclick={syncResources}
      disabled={busyAction !== null}
    >
      <span class="material-symbols-outlined text-sm mr-2">add</span>
      Sync resources
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
    <button
      type="button"
      class="flex items-center gap-2 px-3 py-1.5 border border-slate-200 bg-white rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
      onclick={nextFilterMode}
      aria-label={`Filter resources, current filter ${filterLabel()}`}
    >
      <span class="material-symbols-outlined text-sm">filter_list</span>
      {filterLabel()}
    </button>
    <button
      type="button"
      class="flex items-center gap-2 px-3 py-1.5 border border-slate-200 bg-white rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
      onclick={nextSortMode}
      aria-label={`Sort resources, current sort ${sortLabel()}`}
    >
      <span class="material-symbols-outlined text-sm">sort</span>
      {sortLabel()}
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
        {#if filtered.length === 0}
          <tr>
            <td colspan="5" class="px-6 py-12 text-center text-sm text-slate-500">
              {#if resources.length === 0}
                No resources have been synced yet.
              {:else}
                No resources match the current search and filter.
              {/if}
            </td>
          </tr>
        {:else}
        {#each filtered as resource}
          <tr class="hover:bg-slate-50 transition-colors group">
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="{resource.iconBg} {resource.iconColor} p-1.5 rounded">
                  <span class="material-symbols-outlined text-lg">{resource.icon}</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-sm font-medium text-slate-900">{resource.name}</span>
                  <span class="text-xs text-slate-500">ID: {resource.cf_resource_id}</span>
                </div>
              </div>
            </td>
            <td class="px-6 py-4">
              <span class="inline-flex items-center rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 border border-slate-200">
                {resource.typeLabel}
              </span>
            </td>
            <td class="px-6 py-4">
              {#if resource.monitoring_status === 'active'}
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
            <td class="relative px-6 py-4 text-right">
              <button
                type="button"
                class="p-1 text-slate-400 transition-colors hover:text-slate-700"
                aria-expanded={openMenuId === resource.id}
                aria-haspopup="menu"
                aria-label={`Open actions for ${resource.name}`}
                onclick={() => openMenuId = openMenuId === resource.id ? null : resource.id}
              >
                <span class="material-symbols-outlined text-lg">more_vert</span>
              </button>
              {#if openMenuId === resource.id}
                <div class="absolute right-6 z-10 mt-2 w-44 rounded-lg border border-slate-200 bg-white py-1 text-left shadow-lg">
                  <button
                    type="button"
                    class="block w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    onclick={() =>
                      setMonitoringStatus(
                        resource.id,
                        resource.monitoring_status === 'active' ? 'paused' : 'active',
                      )}
                    disabled={busyAction !== null}
                  >
                    {resource.monitoring_status === 'active' ? 'Pause monitoring' : 'Resume monitoring'}
                  </button>
                  <button
                    type="button"
                    class="block w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    onclick={() => removeResource(resource.id)}
                    disabled={busyAction !== null}
                  >
                    Remove resource
                  </button>
                </div>
              {/if}
            </td>
          </tr>
        {/each}
        {/if}
      </tbody>
    </table>
    <div class="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3">
      <span class="text-sm text-slate-500">Showing {filtered.length} of {resources.length} results</span>
      <span class="text-xs text-slate-400">Inventory pagination is not needed because the current backend returns the full synced resource list.</span>
    </div>
  </div>
</div>
