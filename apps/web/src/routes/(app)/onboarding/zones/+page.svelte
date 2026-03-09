<!-- Onboarding Step 3: Configure Alerts — split left/right panel layout -->
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
          <h2 class="text-2xl font-bold leading-tight tracking-[-0.015em]">Budget Guard</h2>
        </div>

        <!-- Headline -->
        <div class="flex flex-col gap-6">
          <h1 class="text-4xl font-black leading-tight text-slate-900">
            Personalized Protection.
          </h1>
          <p class="text-lg text-slate-600">
            Set up your alerts so we can notify you the moment your infrastructure costs start doing something unexpected.
          </p>
        </div>

        <!-- Sample alert card -->
        <div class="flex flex-col gap-6 mt-4">
          <div class="flex flex-col p-5 rounded-xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
            <div class="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2 text-red-600 font-bold text-sm bg-red-50 px-2 py-1 rounded-md">
                <span class="material-symbols-outlined text-sm">warning</span>
                High Severity
              </div>
              <span class="text-xs text-slate-500 font-medium">Just now</span>
            </div>
            <h3 class="font-bold text-slate-900 text-lg mb-1">Unusual Workers Traffic Detected</h3>
            <p class="text-sm text-slate-600 mb-4">We've detected a 300% spike in Worker invocations compared to your historical baseline for this time of day.</p>
            <div class="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
              <div class="flex flex-col">
                <span class="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Estimated Impact</span>
                <span class="font-bold text-slate-900 text-lg">$45.00</span>
              </div>
              <div class="flex flex-col text-right">
                <span class="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Service</span>
                <span class="font-medium text-slate-700">Workers</span>
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
                <span class="absolute -bottom-6 left-4 -translate-x-1/2 text-xs font-medium text-slate-900 w-max">Configure Alerts</span>
              </li>
            </ol>
          </nav>

          <!-- Mobile logo -->
          <div class="flex items-center gap-3 text-slate-900 mb-8 lg:hidden justify-center">
            <div class="size-6 text-[var(--color-primary)]">
              <span class="material-symbols-outlined text-2xl">notifications_active</span>
            </div>
            <h2 class="text-xl font-bold leading-tight tracking-[-0.015em]">Budget Guard</h2>
          </div>

          <div class="text-center lg:text-left mb-8 mt-4">
            <h2 class="text-3xl font-bold tracking-tight text-slate-900">Configure Your Alerts</h2>
            <p class="mt-2 text-sm text-slate-600">
              Tell us when and how you want to be notified of unexpected charges.
            </p>
          </div>

          <div class="mt-8">
            <form class="space-y-6" method="POST" action="?/configure">
              <div class="space-y-6">

                <!-- Daily budget threshold -->
                <div>
                  <label class="block text-sm font-medium leading-6 text-slate-900" for="budget_threshold">Daily Budget Threshold ($)</label>
                  <p class="text-xs text-slate-500 mb-2">We'll alert you if your forecasted daily spend exceeds this amount.</p>
                  <div class="relative mt-2 rounded-md shadow-sm">
                    <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span class="text-slate-500 sm:text-sm">$</span>
                    </div>
                    <input
                      class="block w-full rounded-md border-0 py-2.5 pl-7 text-slate-900 bg-white ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)] sm:text-sm sm:leading-6"
                      id="budget_threshold"
                      name="budget_threshold"
                      placeholder="0.00"
                      type="number"
                      value="10.00"
                    />
                  </div>
                </div>

                <!-- Notification channels -->
                <div>
                  <fieldset>
                    <legend class="text-sm font-medium leading-6 text-slate-900">Notification Channels</legend>
                    <p class="text-xs text-slate-500 mb-3">Select how you want to receive alerts.</p>
                    <div class="space-y-3">
                      <div class="relative flex items-start">
                        <div class="flex h-6 items-center">
                          <input
                            checked
                            class="h-4 w-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                            id="channel_email"
                            name="channels"
                            type="checkbox"
                            value="email"
                          />
                        </div>
                        <div class="ml-3 text-sm leading-6">
                          <label class="font-medium text-slate-900" for="channel_email">Email</label>
                          <span class="text-slate-500 inline-block ml-2 text-xs">(user@example.com)</span>
                        </div>
                      </div>
                      <div class="relative flex items-start">
                        <div class="flex h-6 items-center">
                          <input
                            class="h-4 w-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                            id="channel_slack"
                            name="channels"
                            type="checkbox"
                            value="slack"
                          />
                        </div>
                        <div class="ml-3 text-sm leading-6">
                          <label class="font-medium text-slate-900" for="channel_slack">Slack</label>
                        </div>
                      </div>
                      <div class="relative flex items-start">
                        <div class="flex h-6 items-center">
                          <input
                            class="h-4 w-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                            id="channel_discord"
                            name="channels"
                            type="checkbox"
                            value="discord"
                          />
                        </div>
                        <div class="ml-3 text-sm leading-6">
                          <label class="font-medium text-slate-900" for="channel_discord">Discord</label>
                        </div>
                      </div>
                    </div>
                  </fieldset>
                </div>

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
            <p>You can always change these settings later or set up more advanced alerts in your dashboard.</p>
          </div>

        </div>
      </div>
    </div>

  </div>
</div>
