<script lang="ts">
let showInviteModal = $state(true);

function closeInviteModal() {
	showInviteModal = false;
}
</script>

<!-- Onboarding success celebration page -->
<div class="font-sans bg-[var(--color-background-light)] text-slate-900 min-h-screen flex flex-col antialiased">
  <div class="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
    <div class="flex h-full grow flex-col">

      <!-- Header -->
      <header class="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 px-10 py-4 bg-white sticky top-0 z-10 shadow-sm">
        <div class="flex items-center gap-4 text-[var(--color-primary)]">
          <div class="size-6 text-[var(--color-primary)] flex items-center justify-center">
            <span class="material-symbols-outlined" style="font-size: 28px;">security</span>
          </div>
          <h2 class="text-slate-900 text-xl font-bold leading-tight tracking-tight">Budget Guard</h2>
        </div>
        <div class="flex flex-1 justify-end gap-8">
          <div class="flex items-center gap-4">
            <span class="material-symbols-outlined text-slate-500 hover:text-slate-900 cursor-pointer">help</span>
            <span class="material-symbols-outlined text-slate-500 hover:text-slate-900 cursor-pointer">notifications</span>
            <!-- Avatar placeholder (replaces external image URL) -->
            <div class="size-10 rounded-full border border-slate-200 bg-slate-200 flex items-center justify-center cursor-pointer overflow-hidden">
              <span class="material-symbols-outlined text-slate-500">person</span>
            </div>
          </div>
        </div>
      </header>

      <!-- Main celebration content -->
      <main class="flex-1 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
        <!-- Decorative confetti dots -->
        <div
          class="absolute inset-0 pointer-events-none opacity-20"
          style="background-image: radial-gradient(circle at 20% 30%, #ef8325 2px, transparent 2px), radial-gradient(circle at 80% 20%, #ef8325 3px, transparent 3px), radial-gradient(circle at 10% 80%, #10b981 2px, transparent 2px), radial-gradient(circle at 90% 70%, #10b981 2.5px, transparent 2.5px), radial-gradient(circle at 50% 10%, #3b82f6 2px, transparent 2px); background-size: 150px 150px; background-position: 0 0, 50px 50px, 100px 100px, 20px 80px, 70px 10px;"
        ></div>

        <div class="max-w-[640px] w-full bg-white rounded-xl shadow-lg border border-slate-100 p-8 sm:p-12 z-10 relative">
          <div class="flex flex-col items-center gap-8">

            <!-- Success icon -->
            <div class="size-24 rounded-full bg-green-100 flex items-center justify-center text-green-500 mb-2 shadow-sm border border-green-200">
              <span class="material-symbols-outlined" style="font-size: 48px;">check_circle</span>
            </div>

            <!-- Headline -->
            <div class="flex flex-col items-center gap-3 text-center">
              <h1 class="text-3xl font-bold leading-tight tracking-tight text-slate-900">You're all set! Budget Guard is now active.</h1>
              <p class="text-base text-slate-600 max-w-md">
                We've started analyzing your Cloudflare activity. Your first report will be ready shortly.
              </p>
            </div>

            <!-- Account summary -->
            <div class="w-full bg-slate-50 rounded-lg border border-slate-200 p-6 my-2">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                <div class="flex flex-col gap-1">
                  <p class="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                    <span class="material-symbols-outlined" style="font-size: 16px;">cloud</span>
                    Connected Account
                  </p>
                  <p class="text-base font-semibold text-slate-900">Acme Corp Cloudflare</p>
                </div>
                <div class="flex flex-col gap-1 sm:border-l sm:border-slate-200 sm:pl-6">
                  <p class="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                    <span class="material-symbols-outlined" style="font-size: 16px;">monitoring</span>
                    Active Daily Threshold
                  </p>
                  <p class="text-base font-semibold text-slate-900">10,000 requests</p>
                </div>
              </div>
            </div>

            <!-- CTA buttons -->
            <div class="flex flex-col sm:flex-row w-full gap-4 mt-4 justify-center">
              <a
                href="/dashboard"
                class="flex items-center justify-center gap-2 rounded-lg h-12 px-6 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white text-base font-semibold leading-normal transition-colors shadow-sm min-w-[200px]"
              >
                <span class="material-symbols-outlined" style="font-size: 20px;">dashboard</span>
                Go to Dashboard
              </a>
              <button
                onclick={() => (showInviteModal = true)}
                class="flex items-center justify-center gap-2 rounded-lg h-12 px-6 bg-transparent border border-slate-300 hover:bg-slate-50 text-slate-700 text-base font-medium leading-normal transition-colors min-w-[200px]"
              >
                <span class="material-symbols-outlined" style="font-size: 20px;">group_add</span>
                Invite Team Members
              </button>
            </div>

          </div>
        </div>
      </main>

    </div>
  </div>

  <!-- Invite Team Modal -->
  {#if showInviteModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
    <div class="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">

      <div class="px-6 py-6 sm:px-8 sm:py-8 border-b border-slate-200">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-xl font-bold text-slate-900">Invite your team</h2>
          <button
            onclick={closeInviteModal}
            class="text-slate-400 hover:text-slate-500 focus:outline-none"
          >
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <p class="text-sm text-slate-600">Get your team involved in monitoring infrastructure costs.</p>
      </div>

      <div class="px-6 py-6 sm:px-8 flex flex-col gap-6">
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-slate-700" for="emails">Email addresses</label>
          <textarea
            class="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] focus:outline-none resize-none"
            id="emails"
            placeholder="team@example.com, developer@example.com"
            rows="4"
          ></textarea>
          <p class="text-xs text-slate-500">Separate multiple emails with commas.</p>
        </div>
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-slate-700" for="role">Role</label>
          <div class="relative">
            <select
              class="w-full appearance-none rounded-lg border border-slate-300 bg-white px-4 py-3 pr-10 text-sm text-slate-900 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] focus:outline-none"
              id="role"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
              <span class="material-symbols-outlined" style="font-size: 20px;">expand_more</span>
            </div>
          </div>
        </div>
      </div>

      <div class="px-6 py-4 sm:px-8 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center gap-4 justify-between">
        <button
          onclick={closeInviteModal}
          class="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          Skip for now
        </button>
        <button class="flex items-center justify-center gap-2 rounded-lg h-10 px-6 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white text-sm font-semibold leading-normal transition-colors shadow-sm w-full sm:w-auto">
          Invite
        </button>
      </div>

    </div>
  </div>
  {/if}
</div>
