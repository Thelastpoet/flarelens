<!-- Onboarding Step 2: Connect Cloudflare — split left/right panel layout -->
<div class="bg-[var(--color-background-light)] font-sans text-slate-900 antialiased h-screen flex overflow-hidden">
  <div class="flex w-full h-full">

    <!-- Left Panel: Security info -->
    <div class="hidden lg:flex flex-col flex-1 bg-slate-50 border-r border-slate-200 p-12 justify-center relative overflow-hidden">
      <div class="relative z-10 max-w-lg mx-auto w-full flex flex-col gap-12">

        <!-- Logo -->
        <div class="flex items-center gap-4 text-slate-900 mb-4">
          <div class="size-8 text-[var(--color-primary)]">
            <span class="material-symbols-outlined text-3xl">shield_lock</span>
          </div>
          <h2 class="text-2xl font-bold leading-tight tracking-[-0.015em]">Budget Guard</h2>
        </div>

        <!-- Headline -->
        <div class="flex flex-col gap-6">
          <h1 class="text-4xl font-black leading-tight text-slate-900">
            Security First.
          </h1>
          <p class="text-lg text-slate-600">
            We take the security of your Cloudflare account seriously. Here is how we handle your API tokens to keep your infrastructure safe.
          </p>
        </div>

        <!-- Security cards -->
        <div class="flex flex-col gap-6 mt-4">
          <div class="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div class="size-10 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0 mt-0.5">
              <span class="material-symbols-outlined">visibility</span>
            </div>
            <div>
              <h3 class="font-bold text-slate-900">Read-only access</h3>
              <p class="text-sm text-slate-500 mt-1">We only request permissions to read your account billing and usage statistics. We can never modify your settings.</p>
            </div>
          </div>
          <div class="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div class="size-10 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0 mt-0.5">
              <span class="material-symbols-outlined">lock</span>
            </div>
            <div>
              <h3 class="font-bold text-slate-900">Encrypted storage</h3>
              <p class="text-sm text-slate-500 mt-1">Your API tokens are encrypted at rest using industry-standard AES-256 encryption. We never store them in plain text.</p>
            </div>
          </div>
          <div class="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div class="size-10 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0 mt-0.5">
              <span class="material-symbols-outlined">cancel</span>
            </div>
            <div>
              <h3 class="font-bold text-slate-900">Revokable anytime</h3>
              <p class="text-sm text-slate-500 mt-1">You remain in complete control. You can revoke our access directly from your Cloudflare dashboard at any moment.</p>
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
              <!-- Step 2: current -->
              <li class="relative pr-8 sm:pr-12">
                <div aria-hidden="true" class="absolute inset-0 flex items-center">
                  <div class="h-0.5 w-full bg-slate-200"></div>
                </div>
                <div aria-current="step" class="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--color-primary)] bg-white">
                  <span class="text-[var(--color-primary)] text-sm font-medium">2</span>
                </div>
                <span class="absolute -bottom-6 left-4 -translate-x-1/2 text-xs font-medium text-slate-900 w-max">Connect Cloudflare</span>
              </li>
              <!-- Step 3: upcoming -->
              <li class="relative">
                <div class="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-300 bg-white">
                  <span class="text-slate-500 text-sm font-medium">3</span>
                </div>
                <span class="absolute -bottom-6 left-4 -translate-x-1/2 text-xs font-medium text-slate-500 w-max">Configure Alerts</span>
              </li>
            </ol>
          </nav>

          <!-- Mobile logo -->
          <div class="flex items-center gap-3 text-slate-900 mb-8 lg:hidden justify-center">
            <div class="size-6 text-[var(--color-primary)]">
              <span class="material-symbols-outlined text-2xl">shield_lock</span>
            </div>
            <h2 class="text-xl font-bold leading-tight tracking-[-0.015em]">Budget Guard</h2>
          </div>

          <div class="text-center lg:text-left mb-8 mt-4">
            <h2 class="text-3xl font-bold tracking-tight text-slate-900">Connect your Cloudflare Account</h2>
            <p class="mt-2 text-sm text-slate-600">
              Provide your API credentials to start monitoring your usage and costs.
            </p>
          </div>

          <div class="mt-8">
            <form class="space-y-6" method="POST" action="?/connect">
              <div class="space-y-5">
                <div>
                  <div class="flex items-center justify-between">
                    <label class="block text-sm font-medium leading-6 text-slate-900" for="api_token">Cloudflare API Token</label>
                    <a class="text-xs font-medium text-[var(--color-primary)] hover:text-[var(--color-primary)]/80" href="/docs/api-token">Where do I find my API token?</a>
                  </div>
                  <div class="mt-2">
                    <input
                      autocomplete="off"
                      class="block w-full rounded-md border-0 py-2.5 text-slate-900 bg-white shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)] sm:text-sm sm:leading-6"
                      id="api_token"
                      name="api_token"
                      placeholder="e.g. abcdef1234567890"
                      required
                      type="password"
                    />
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium leading-6 text-slate-900" for="account_id">Account ID</label>
                  <div class="mt-2">
                    <input
                      autocomplete="off"
                      class="block w-full rounded-md border-0 py-2.5 text-slate-900 bg-white shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)] sm:text-sm sm:leading-6"
                      id="account_id"
                      name="account_id"
                      placeholder="e.g. 023e105f4ecef8ad9ca31a8372d0c353"
                      required
                      type="text"
                    />
                  </div>
                  <p class="mt-2 text-xs text-slate-500" id="account-id-description">Found on the right side of your Cloudflare dashboard overview.</p>
                </div>
              </div>
              <div class="pt-2">
                <button
                  class="flex w-full justify-center rounded-md bg-[var(--color-primary)] px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-[var(--color-primary)]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] transition-colors"
                  type="submit"
                >
                  Verify &amp; Connect
                </button>
              </div>
            </form>
          </div>

          <!-- Info banner -->
          <div class="mt-8 flex items-start gap-3 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100">
            <span class="material-symbols-outlined text-blue-500 shrink-0">info</span>
            <p>Connecting your account securely syncs your current usage data. This process might take a few seconds.</p>
          </div>

        </div>
      </div>
    </div>

  </div>
</div>
