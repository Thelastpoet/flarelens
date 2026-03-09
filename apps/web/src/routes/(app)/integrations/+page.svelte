<script lang="ts">
type IntegrationStatus = 'connected' | 'not_connected' | 'active';

type Integration = {
	icon: string;
	iconBg: string;
	iconColor: string;
	name: string;
	description: string;
	status: IntegrationStatus;
	statusLabel: string;
	actionLabel: string;
	actionVariant: 'outline' | 'primary';
};

const integrations = $state<Integration[]>([
	{
		icon: 'forum',
		iconBg: 'bg-[#E01E5A]/10',
		iconColor: 'text-[#E01E5A]',
		name: 'Slack',
		description: "Send real-time alerts and budget reports directly to your team's Slack channels.",
		status: 'connected',
		statusLabel: 'Connected',
		actionLabel: 'Configure',
		actionVariant: 'outline',
	},
	{
		icon: 'sports_esports',
		iconBg: 'bg-[#5865F2]/10',
		iconColor: 'text-[#5865F2]',
		name: 'Discord',
		description: 'Receive automated notifications and usage warnings in your Discord server.',
		status: 'not_connected',
		statusLabel: 'Not Connected',
		actionLabel: 'Connect',
		actionVariant: 'primary',
	},
	{
		icon: 'groups',
		iconBg: 'bg-[#6264A7]/10',
		iconColor: 'text-[#6264A7]',
		name: 'Microsoft Teams',
		description: 'Integrate budget alerts directly into your Microsoft Teams workflow.',
		status: 'not_connected',
		statusLabel: 'Not Connected',
		actionLabel: 'Connect',
		actionVariant: 'primary',
	},
	{
		icon: 'contact_phone',
		iconBg: 'bg-[#06AC38]/10',
		iconColor: 'text-[#06AC38]',
		name: 'PagerDuty',
		description: 'Trigger PagerDuty incidents when critical budget thresholds are exceeded.',
		status: 'not_connected',
		statusLabel: 'Not Connected',
		actionLabel: 'Connect',
		actionVariant: 'primary',
	},
	{
		icon: 'webhook',
		iconBg: 'bg-slate-800/10 dark:bg-slate-100/10',
		iconColor: 'text-slate-800 dark:text-slate-100',
		name: 'Custom Webhooks',
		description: 'Send JSON payloads to your own endpoints for custom automation and reporting.',
		status: 'active',
		statusLabel: '2 Active',
		actionLabel: 'Manage Webhooks',
		actionVariant: 'outline',
	},
]);
</script>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {#each integrations as integration}
    <div class="flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div class="p-6 flex items-start justify-between">
        <div class="w-12 h-12 rounded-lg {integration.iconBg} flex items-center justify-center {integration.iconColor} mb-4">
          <span class="material-symbols-outlined" style="font-size: 28px;">{integration.icon}</span>
        </div>
        {#if integration.status === 'connected' || integration.status === 'active'}
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            {integration.statusLabel}
          </span>
        {:else}
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {integration.statusLabel}
          </span>
        {/if}
      </div>
      <div class="px-6 pb-4 flex-1">
        <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">{integration.name}</h3>
        <p class="text-slate-500 dark:text-slate-400 text-sm line-clamp-2">{integration.description}</p>
      </div>
      <div class="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 mt-auto">
        {#if integration.actionVariant === 'outline'}
          <button class="w-full flex items-center justify-center h-9 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            {integration.actionLabel}
          </button>
        {:else}
          <button class="w-full flex items-center justify-center h-9 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
            {integration.actionLabel}
          </button>
        {/if}
      </div>
    </div>
  {/each}

  <!-- Request Integration placeholder -->
  <div class="flex flex-col bg-transparent rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary dark:hover:border-primary transition-colors cursor-pointer justify-center items-center min-h-[240px]">
    <div class="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 mb-4">
      <span class="material-symbols-outlined" style="font-size: 24px;">add</span>
    </div>
    <h3 class="text-base font-medium text-slate-900 dark:text-slate-100 mb-1">Request Integration</h3>
    <p class="text-slate-500 dark:text-slate-400 text-sm text-center px-6">Don't see your tool? Let us know what you'd like to connect.</p>
  </div>
</div>
