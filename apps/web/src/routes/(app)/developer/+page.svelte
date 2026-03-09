<script lang="ts">
type Token = {
	name: string;
	created: string;
	lastUsed: string;
};

type Webhook = {
	icon: string;
	name: string;
	url: string;
	status: 'active' | 'disabled';
	triggers: string;
};

const tokens = $state<Token[]>([
	{ name: 'Datadog Integration Token', created: 'Oct 12, 2023', lastUsed: '2 mins ago' },
	{ name: 'CLI Local Dev', created: 'Sep 05, 2023', lastUsed: 'Never' },
]);

const webhooks = $state<Webhook[]>([
	{
		icon: 'monitoring',
		name: 'Datadog Events',
		url: 'https://api.datadoghq.com/api/v1/events',
		status: 'active',
		triggers: 'Budget Exceeded, Anomaly Detected',
	},
	{
		icon: 'call_merge',
		name: 'Slack Alerts #ops',
		url: 'https://hooks.slack.com/services/T0...',
		status: 'disabled',
		triggers: 'Critical Alerts',
	},
]);

let activeSnippetTab = $state('cURL');
const snippetTabs = ['cURL', 'Node.js', 'Python'];

let copied = $state(false);

function copySnippet() {
	navigator.clipboard.writeText(
		`curl --request GET \\\n  --url https://api.budgetguard.cloudflare.com/v1/budgets/summary \\\n  --header 'Authorization: Bearer YOUR_API_TOKEN' \\\n  --header 'Content-Type: application/json'`,
	);
	copied = true;
	setTimeout(() => (copied = false), 2000);
}
</script>

<div class="max-w-4xl mx-auto flex flex-col gap-10">
  <!-- Header -->
  <div class="flex flex-wrap justify-between items-end gap-4 border-b border-primary/20 pb-6">
    <div class="flex min-w-72 flex-col gap-2">
      <h1 class="text-slate-900 dark:text-slate-100 text-3xl font-black leading-tight tracking-[-0.033em]">Developer &amp; API Settings</h1>
      <p class="text-slate-600 dark:text-slate-400 text-base font-normal leading-normal">Manage personal access tokens, webhooks, and integrate Budget Guard with your infrastructure.</p>
    </div>
  </div>

  <!-- Personal Access Tokens -->
  <section class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-slate-900 dark:text-slate-100 text-xl font-bold leading-tight">Personal Access Tokens</h2>
        <p class="text-slate-600 dark:text-slate-400 text-sm mt-1">Tokens you have generated that can be used to access the Budget Guard API.</p>
      </div>
      <button class="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary/90 transition-colors text-sm font-semibold shadow-sm">
        <span class="material-symbols-outlined text-sm">add</span>
        Create Token
      </button>
    </div>

    <div class="bg-white dark:bg-slate-800 rounded-xl border border-primary/20 shadow-sm overflow-hidden">
      <div class="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 p-4 border-b border-primary/10 bg-primary/5 text-sm font-semibold text-slate-700 dark:text-slate-300">
        <div>Token Name</div>
        <div>Created</div>
        <div>Last Used</div>
        <div>Actions</div>
      </div>
      {#each tokens as token, i}
        <div class="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 p-4 {i < tokens.length - 1 ? 'border-b border-primary/10' : ''} items-center text-sm hover:bg-primary/5 transition-colors">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-lg">vpn_key</span>
            <span class="font-medium">{token.name}</span>
          </div>
          <div class="text-slate-500">{token.created}</div>
          <div class="text-slate-500">{token.lastUsed}</div>
          <div>
            <button class="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50">
              <span class="material-symbols-outlined text-sm">delete</span>
            </button>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- Webhooks -->
  <section class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-slate-900 dark:text-slate-100 text-xl font-bold leading-tight">Webhook Outbound</h2>
        <p class="text-slate-600 dark:text-slate-400 text-sm mt-1">Send budget alert events to external tools like Datadog, Grafana, or PagerDuty.</p>
      </div>
      <button class="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-primary hover:bg-primary/20 transition-colors text-sm font-semibold border border-primary/20">
        <span class="material-symbols-outlined text-sm">webhook</span>
        Add Endpoint
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      {#each webhooks as wh}
        <div class="bg-white dark:bg-slate-800 p-5 rounded-xl border border-primary/20 shadow-sm flex flex-col gap-4 {wh.status === 'disabled' ? 'opacity-75' : ''}">
          <div class="flex justify-between items-start">
            <div class="flex items-center gap-3">
              <div class="p-2 {wh.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'} rounded-lg">
                <span class="material-symbols-outlined">{wh.icon}</span>
              </div>
              <div>
                <h3 class="font-bold text-slate-900 dark:text-slate-100">{wh.name}</h3>
                <p class="text-xs text-slate-500 font-mono">{wh.url}</p>
              </div>
            </div>
            {#if wh.status === 'active'}
              <span class="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold rounded-full flex items-center gap-1">
                <div class="w-1.5 h-1.5 rounded-full bg-green-500"></div> Active
              </span>
            {:else}
              <span class="px-2 py-1 bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 text-xs font-bold rounded-full flex items-center gap-1">
                <div class="w-1.5 h-1.5 rounded-full bg-slate-400"></div> Disabled
              </span>
            {/if}
          </div>
          <div class="flex justify-between items-center mt-2 border-t border-slate-100 dark:border-slate-700 pt-3">
            <span class="text-xs text-slate-500">Triggers: {wh.triggers}</span>
            <button class="text-primary hover:underline text-xs font-medium">
              {wh.status === 'active' ? 'Edit' : 'Enable'}
            </button>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- API Quickstart -->
  <section class="flex flex-col gap-6">
    <div>
      <h2 class="text-slate-900 dark:text-slate-100 text-xl font-bold leading-tight">API Quickstart</h2>
      <p class="text-slate-600 dark:text-slate-400 text-sm mt-1">Use our REST API to query budgets and anomalies programmatically.</p>
    </div>
    <div class="rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-lg">
      <div class="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800">
        <div class="flex gap-2">
          {#each snippetTabs as tab}
            <button
              onclick={() => (activeSnippetTab = tab)}
              class="text-xs font-medium px-3 py-1 rounded {activeSnippetTab === tab ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white transition-colors'}"
            >
              {tab}
            </button>
          {/each}
        </div>
        <button onclick={copySnippet} class="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-xs">
          <span class="material-symbols-outlined text-sm">content_copy</span>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div class="p-4 overflow-x-auto">
        <pre class="text-sm font-mono text-slate-300 leading-relaxed"><span class="text-pink-400">curl</span> --request GET \
  --url https://api.budgetguard.cloudflare.com/v1/budgets/summary \
  --header <span class="text-green-300">'Authorization: Bearer YOUR_API_TOKEN'</span> \
  --header <span class="text-green-300">'Content-Type: application/json'</span>
</pre>
      </div>
    </div>
  </section>
</div>
