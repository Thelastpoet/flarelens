<script lang="ts">
type Rule = {
	id: number;
	icon: string;
	iconColor: string;
	title: string;
	enabled: boolean;
	trigger: string;
	action: string;
	lastTriggered: string;
	stat: string;
	statColor: string;
	disabled: boolean;
};

let rules = $state<Rule[]>([
	{
		id: 1,
		icon: 'speed',
		iconColor: 'text-amber-500',
		title: 'Auto Rate-limit',
		enabled: true,
		trigger: 'Traffic > 10,000 req/min',
		action: 'Apply 100 req/IP limit',
		lastTriggered: '2 hours ago',
		stat: 'Prevented ~$45 cost',
		statColor: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30',
		disabled: false,
	},
	{
		id: 2,
		icon: 'security',
		iconColor: 'text-rose-500',
		title: 'Enable Under Attack Mode',
		enabled: true,
		trigger: '500x error spike > 5%',
		action: 'Challenge all visitors',
		lastTriggered: 'Never',
		stat: 'Monitoring actively',
		statColor: 'text-slate-500',
		disabled: false,
	},
	{
		id: 3,
		icon: 'pause_circle',
		iconColor: 'text-indigo-500',
		title: 'Pause Worker',
		enabled: false,
		trigger: 'Daily cost > $10.00',
		action: 'Disable route processing',
		lastTriggered: '',
		stat: '',
		statColor: '',
		disabled: true,
	},
]);
</script>

<div class="max-w-5xl mx-auto space-y-6">
  <!-- Page header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white">Automated Mitigation Rules</h1>
      <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage rules to prevent unexpected infrastructure costs and anomalies.</p>
    </div>
    <div class="flex items-center gap-2">
      <span class="text-sm text-slate-500">Status:</span>
      <span class="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
      </span>
    </div>
  </div>

  <!-- Rules list -->
  <div class="grid gap-4">
    {#each rules as rule}
      <div class="flex flex-col md:flex-row items-stretch justify-between gap-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm {rule.disabled ? 'opacity-75' : ''}">
        <div class="flex flex-[2_2_0px] flex-col justify-between gap-4">
          <div>
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined {rule.iconColor}">{rule.icon}</span>
                <h3 class="text-lg font-bold text-slate-900 dark:text-white">{rule.title}</h3>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  class="sr-only peer"
                  bind:checked={rule.enabled}
                />
                <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-primary"></div>
              </label>
            </div>
            <div class="grid grid-cols-2 gap-4 mt-4">
              <div class="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
                <span class="text-xs text-slate-500 block mb-1">Trigger</span>
                <span class="text-sm font-medium text-slate-700 dark:text-slate-300">{rule.trigger}</span>
              </div>
              <div class="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
                <span class="text-xs text-slate-500 block mb-1">Action</span>
                <span class="text-sm font-medium text-slate-700 dark:text-slate-300">{rule.action}</span>
              </div>
            </div>
          </div>
          <button class="inline-flex w-max items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <span class="material-symbols-outlined text-[18px]">edit</span>
            Edit Rule
          </button>
        </div>

        {#if rule.disabled}
          <div class="w-full md:w-64 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex-shrink-0 flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-700">
            <div class="p-4 text-center">
              <span class="material-symbols-outlined text-slate-400 mb-1">power_settings_new</span>
              <div class="text-sm text-slate-500">Rule is currently disabled</div>
            </div>
          </div>
        {:else}
          <div class="w-full md:w-64 bg-slate-100 dark:bg-slate-800 rounded-lg flex-shrink-0 flex items-center justify-center border border-slate-200 dark:border-slate-700 {rule.lastTriggered === 'Never' ? 'opacity-50' : ''}">
            <div class="p-4 text-center">
              <div class="text-xs text-slate-500 mb-1">Last triggered</div>
              <div class="text-sm font-medium text-slate-900 dark:text-white">{rule.lastTriggered}</div>
              {#if rule.stat}
                <div class="mt-2 text-xs py-1 px-2 rounded-md {rule.statColor}">{rule.stat}</div>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>
