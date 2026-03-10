<script lang="ts">
	import type { PageData } from './$types.js';

	interface ResourceRecord {
		id: string;
		name: string;
		type: 'zone' | 'worker' | 'r2_bucket' | 'kv_namespace' | 'd1_database';
		monitoring_status: 'active' | 'paused';
		cf_resource_id: string;
	}

	let { data }: { data: PageData } = $props();

	const allResources = $derived((data.resources ?? []) as ResourceRecord[]);
	const primaryResources = $derived(
		allResources.filter((resource) => resource.type === 'zone'),
	);
	const fallbackResources = $derived(
		primaryResources.length > 0 ? primaryResources : allResources,
	);

	function typeLabel(type: ResourceRecord['type']): string {
		switch (type) {
			case 'zone':
				return 'Zone';
			case 'worker':
				return 'Worker';
			case 'r2_bucket':
				return 'R2 Bucket';
			case 'kv_namespace':
				return 'KV Namespace';
			case 'd1_database':
				return 'D1 Database';
		}
	}
</script>

<!-- Onboarding Step 3: Review resources — split left/right panel layout -->
<div class="bg-[var(--color-background-light)] font-sans text-slate-900 antialiased h-screen flex overflow-hidden">
  <div class="flex w-full h-full">

    <!-- Left Panel: Alert preview -->
    <div class="hidden lg:flex flex-col flex-1 bg-slate-50 border-r border-slate-200 p-12 justify-center relative overflow-hidden">
      <div class="relative z-10 max-w-lg mx-auto w-full flex flex-col gap-12">

        <!-- Logo -->
        <div class="flex items-center gap-4 text-slate-900 mb-4">
          <div class="size-8 text-[var(--color-primary)]">
            <span class="material-symbols-outlined text-3xl">notifications_active</span>
          </div>
          <h2 class="text-2xl font-bold leading-tight tracking-[-0.015em]">FlareLens</h2>
        </div>

        <!-- Headline -->
        <div class="flex flex-col gap-6">
          <h1 class="text-4xl font-black leading-tight text-slate-900">
            Personalized Protection.
          </h1>
          <p class="text-lg text-slate-600">
            Review the resources FlareLens discovered and choose what you want to monitor first.
          </p>
        </div>

        <!-- Sample monitoring card -->
        <div class="flex flex-col gap-6 mt-4">
          <div class="flex flex-col p-5 rounded-xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
            <div class="absolute top-0 left-0 w-1 h-full bg-[var(--color-primary)]"></div>
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2 text-[var(--color-primary)] font-bold text-sm bg-[var(--color-primary)]/10 px-2 py-1 rounded-md">
                <span class="material-symbols-outlined text-sm">cloud_done</span>
                Ready to Monitor
              </div>
              <span class="text-xs text-slate-500 font-medium">{fallbackResources.length} discovered</span>
            </div>
            <h3 class="font-bold text-slate-900 text-lg mb-1">Start with the highest-value Cloudflare resources</h3>
            <p class="text-sm text-slate-600 mb-4">You can enable or pause individual resources now and refine your monitoring scope later from the inventory screen.</p>
            <div class="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
              <div class="flex flex-col">
                <span class="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Primary Focus</span>
                <span class="font-bold text-slate-900 text-lg">Zones</span>
              </div>
              <div class="flex flex-col text-right">
                <span class="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Next Step</span>
                <span class="font-medium text-slate-700">Confirm scope</span>
              </div>
            </div>
          </div>
        </div>

      </div>
      <!-- Decorative blob -->
      <div class="absolute -bottom-32 -left-32 size-96 bg-[var(--color-primary)]/20 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
    </div>

    <!-- Right Panel: Form -->
    <div class="flex flex-col flex-1 overflow-y-auto relative">
      <div class="flex-1 flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-20 xl:px-24">
        <div class="mx-auto w-full max-w-md">

          <!-- Step progress -->
          <nav aria-label="Progress" class="mb-12">
            <ol class="flex items-center justify-center" role="list">
              <!-- Step 1: completed -->
              <li class="relative pr-8 sm:pr-12">
                <div aria-hidden="true" class="absolute inset-0 flex items-center">
                  <div class="h-0.5 w-full bg-[var(--color-primary)]"></div>
                </div>
                <div class="relative flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)]">
                  <span class="material-symbols-outlined text-white text-sm">check</span>
                </div>
                <span class="absolute -bottom-6 left-4 -translate-x-1/2 text-xs font-medium text-[var(--color-primary)] w-max">Create Account</span>
              </li>
              <!-- Step 2: completed -->
              <li class="relative pr-8 sm:pr-12">
                <div aria-hidden="true" class="absolute inset-0 flex items-center">
                  <div class="h-0.5 w-full bg-[var(--color-primary)]"></div>
                </div>
                <div class="relative flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)]">
                  <span class="material-symbols-outlined text-white text-sm">check</span>
                </div>
                <span class="absolute -bottom-6 left-4 -translate-x-1/2 text-xs font-medium text-[var(--color-primary)] w-max">Connect Cloudflare</span>
              </li>
              <!-- Step 3: current -->
              <li class="relative">
                <div aria-current="step" class="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--color-primary)] bg-white">
                  <span class="text-[var(--color-primary)] text-sm font-medium">3</span>
                </div>
                <span class="absolute -bottom-6 left-4 -translate-x-1/2 text-xs font-medium text-slate-900 w-max">Select Resources</span>
              </li>
            </ol>
          </nav>

          <!-- Mobile logo -->
          <div class="flex items-center gap-3 text-slate-900 mb-8 lg:hidden justify-center">
            <div class="size-6 text-[var(--color-primary)]">
              <span class="material-symbols-outlined text-2xl">notifications_active</span>
            </div>
            <h2 class="text-xl font-bold leading-tight tracking-[-0.015em]">FlareLens</h2>
          </div>

          <div class="text-center lg:text-left mb-8 mt-4">
            <h2 class="text-3xl font-bold tracking-tight text-slate-900">Choose What to Monitor</h2>
            <p class="mt-2 text-sm text-slate-600">
              Keep monitoring enabled for the resources you want FlareLens to watch right away.
            </p>
          </div>

          <div class="mt-8">
            <form class="space-y-6" method="POST" action="?/confirm">
              <div class="space-y-3">
                {#if fallbackResources.length === 0}
                  <div class="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
                    No resources were discovered yet. Finish setup anyway and use the inventory page to sync again after onboarding.
                  </div>
                {:else}
                  {#each fallbackResources as resource}
                    <label class="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-[var(--color-primary)]/40">
                      <input type="hidden" name="resource_id" value={resource.id} />
                      <input
                        checked={resource.monitoring_status !== 'paused'}
                        class="mt-1 h-4 w-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                        name="enabled"
                        type="checkbox"
                        value={resource.id}
                      />
                      <div class="flex-1">
                        <div class="flex items-center justify-between gap-3">
                          <div>
                            <p class="text-sm font-semibold text-slate-900">{resource.name}</p>
                            <p class="text-xs text-slate-500">{typeLabel(resource.type)} • {resource.cf_resource_id}</p>
                          </div>
                          <span class="rounded-full px-2 py-1 text-xs font-medium {resource.monitoring_status === 'paused' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}">
                            {resource.monitoring_status === 'paused' ? 'Paused' : 'Active'}
                          </span>
                        </div>
                      </div>
                    </label>
                  {/each}
                {/if}
              </div>
              <div class="pt-4">
                <button
                  class="flex w-full justify-center rounded-md bg-[var(--color-primary)] px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-[var(--color-primary)]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] transition-colors"
                  type="submit"
                >
                  Finish Setup
                </button>
              </div>
            </form>
          </div>

          <!-- Info banner -->
          <div class="mt-8 flex items-start gap-3 p-4 bg-amber-50 text-amber-800 rounded-lg text-sm border border-amber-100">
            <span class="material-symbols-outlined text-amber-500 shrink-0">lightbulb</span>
            <p>You can always refine monitoring scope later from inventory, rules, and settings once onboarding is complete.</p>
          </div>

        </div>
      </div>
    </div>

  </div>
</div>
