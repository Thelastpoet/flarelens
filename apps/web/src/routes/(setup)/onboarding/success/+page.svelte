<script lang="ts">
	import { page } from '$app/stores';
	import type { PageData } from './$types.js';

	type SuccessLayoutUser = {
		account?: {
			name?: string | null;
			plan?: string | null;
		};
	};

	let { data }: { data: PageData } = $props();

	const user = $derived(($page.data.user ?? null) as SuccessLayoutUser | null);

	function formatPlanLabel(plan: string | null | undefined): string {
		if (!plan) return 'Plan unavailable';
		return `${plan.charAt(0).toUpperCase()}${plan.slice(1)} plan`;
	}
</script>

<!-- Onboarding success celebration page -->
<div class="font-sans bg-[var(--color-background-light)] text-slate-900 min-h-screen flex flex-col antialiased">
  <div class="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
    <div class="flex h-full grow flex-col">
      <header class="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 px-10 py-4 bg-white sticky top-0 z-10 shadow-sm">
        <div class="flex items-center gap-4 text-[var(--color-primary)]">
          <div class="size-6 text-[var(--color-primary)] flex items-center justify-center">
            <span class="material-symbols-outlined" style="font-size: 28px;">security</span>
          </div>
          <h2 class="text-slate-900 text-xl font-bold leading-tight tracking-tight">FlareLens</h2>
        </div>
        <div class="flex flex-1 justify-end gap-8">
          <div class="flex items-center gap-4">
            <span class="material-symbols-outlined text-slate-500" aria-hidden="true">help</span>
            <span class="material-symbols-outlined text-slate-500" aria-hidden="true">notifications</span>
            <div class="size-10 rounded-full border border-slate-200 bg-slate-200 flex items-center justify-center overflow-hidden" aria-hidden="true">
              <span class="material-symbols-outlined text-slate-500">person</span>
            </div>
          </div>
        </div>
      </header>

      <main class="flex-1 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
        <div
          class="absolute inset-0 pointer-events-none opacity-20"
          style="background-image: radial-gradient(circle at 20% 30%, #ef8325 2px, transparent 2px), radial-gradient(circle at 80% 20%, #ef8325 3px, transparent 3px), radial-gradient(circle at 10% 80%, #10b981 2px, transparent 2px), radial-gradient(circle at 90% 70%, #10b981 2.5px, transparent 2.5px), radial-gradient(circle at 50% 10%, #3b82f6 2px, transparent 2px); background-size: 150px 150px; background-position: 0 0, 50px 50px, 100px 100px, 20px 80px, 70px 10px;"
        ></div>

        <div class="max-w-[640px] w-full bg-white rounded-xl shadow-lg border border-slate-100 p-8 sm:p-12 z-10 relative">
          <div class="flex flex-col items-center gap-8">
            <div class="size-24 rounded-full bg-green-100 flex items-center justify-center text-green-500 mb-2 shadow-sm border border-green-200">
              <span class="material-symbols-outlined" style="font-size: 48px;">check_circle</span>
            </div>

            <div class="flex flex-col items-center gap-3 text-center">
              <h1 class="text-3xl font-bold leading-tight tracking-tight text-slate-900">You're all set! FlareLens is now active.</h1>
              <p class="text-base text-slate-600 max-w-md">
                Your Cloudflare account is connected and FlareLens is ready to monitor the resources you selected during onboarding.
              </p>
            </div>

            <div class="w-full bg-slate-50 rounded-lg border border-slate-200 p-6 my-2">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                <div class="flex flex-col gap-1">
                  <p class="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                    <span class="material-symbols-outlined" style="font-size: 16px;">cloud</span>
                    Connected Account
                  </p>
                  <p class="text-base font-semibold text-slate-900">{user?.account?.name ?? 'Cloudflare account connected'}</p>
                </div>
                <div class="flex flex-col gap-1 sm:border-l sm:border-slate-200 sm:pl-6">
                  <p class="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                    <span class="material-symbols-outlined" style="font-size: 16px;">monitoring</span>
                    Active Monitoring Scope
                  </p>
                  <p class="text-base font-semibold text-slate-900">{data.activeResourceCount} active of {data.resourceCount} synced resources</p>
                </div>
                <div class="flex flex-col gap-1">
                  <p class="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                    <span class="material-symbols-outlined" style="font-size: 16px;">language</span>
                    Zones Available
                  </p>
                  <p class="text-base font-semibold text-slate-900">{data.zoneCount} zones</p>
                </div>
                <div class="flex flex-col gap-1 sm:border-l sm:border-slate-200 sm:pl-6">
                  <p class="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                    <span class="material-symbols-outlined" style="font-size: 16px;">workspace_premium</span>
                    Current Plan
                  </p>
                  <p class="text-base font-semibold text-slate-900">{formatPlanLabel(user?.account?.plan)}</p>
                </div>
              </div>
            </div>

            <div class="flex flex-col sm:flex-row w-full gap-4 mt-4 justify-center">
              <a
                href="/dashboard"
                class="flex items-center justify-center gap-2 rounded-lg h-12 px-6 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white text-base font-semibold leading-normal transition-colors shadow-sm min-w-[200px]"
              >
                <span class="material-symbols-outlined" style="font-size: 20px;">dashboard</span>
                Go to Dashboard
              </a>
              <a
                href="/team"
                class="flex items-center justify-center gap-2 rounded-lg h-12 px-6 bg-transparent border border-slate-300 hover:bg-slate-50 text-slate-700 text-base font-medium leading-normal transition-colors min-w-[200px]"
              >
                <span class="material-symbols-outlined" style="font-size: 20px;">group_add</span>
                Manage Team Access
              </a>
            </div>

            <p class="text-sm text-slate-500 text-center">
              Need to invite teammates or add integrations? You can do that from the Team and Integrations pages after onboarding.
            </p>
          </div>
        </div>
      </main>

    </div>
  </div>
</div>
*** Delete File: /home/manu/development/flarelens/apps/web/src/routes/(app)/onboarding/connect/+page.svelte
*** Delete File: /home/manu/development/flarelens/apps/web/src/routes/(app)/onboarding/zones/+page.svelte
*** Delete File: /home/manu/development/flarelens/apps/web/src/routes/(app)/onboarding/success/+page.svelte
