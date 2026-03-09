<!-- Full-page forgot password: centered card layout -->
<div class="bg-[var(--color-background-light)] font-sans text-slate-900 min-h-screen flex flex-col">
  <div class="flex-1 flex flex-col">

    <!-- Header -->
    <header class="flex items-center justify-between border-b border-[var(--color-primary)]/10 px-10 py-4 bg-white">
      <div class="flex items-center gap-3 text-slate-900">
        <div class="size-6 text-[var(--color-primary)]">
          <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <g clip-path="url(#fp-clip)">
              <path d="M8.57829 8.57829C5.52816 11.6284 3.451 15.5145 2.60947 19.7452C1.76794 23.9758 2.19984 28.361 3.85056 32.3462C5.50128 36.3314 8.29667 39.7376 11.8832 42.134C15.4698 44.5305 19.6865 45.8096 24 45.8096C28.3135 45.8096 32.5302 44.5305 36.1168 42.134C39.7033 39.7375 42.4987 36.3314 44.1494 32.3462C45.8002 28.361 46.2321 23.9758 45.3905 19.7452C44.549 15.5145 42.4718 11.6284 39.4217 8.57829L24 24L8.57829 8.57829Z" fill="currentColor"></path>
            </g>
            <defs>
              <clipPath id="fp-clip"><rect fill="white" height="48" width="48"></rect></clipPath>
            </defs>
          </svg>
        </div>
        <h2 class="text-xl font-bold leading-tight tracking-tight">FlareLens</h2>
      </div>
    </header>

    <!-- Main content -->
    <main class="flex-1 flex items-center justify-center p-6">
      <div class="w-full max-w-md bg-white rounded-xl shadow-sm border border-[var(--color-primary)]/10 p-8 flex flex-col gap-6">

        <div>
          <h1 class="text-3xl font-bold leading-tight text-center text-slate-900">Reset your password</h1>
          <p class="text-slate-600 text-center mt-2 text-sm">We'll send you an email with a link to reset your password.</p>
        </div>

        <form class="flex flex-col gap-5" method="POST" action="?/forgotPassword">
          <label class="flex flex-col gap-2">
            <span class="text-sm font-medium text-slate-700">Email Address</span>
            <input
              class="w-full rounded-lg border border-[var(--color-primary)]/20 bg-transparent focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] h-12 px-4 text-sm transition-colors"
              placeholder="name@company.com"
              required
              type="email"
              name="email"
            />
          </label>
          <button
            class="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white font-semibold rounded-lg h-12 px-5 transition-colors flex items-center justify-center gap-2"
            type="submit"
          >
            <span>Send Reset Link</span>
            <span class="material-symbols-outlined text-[20px]">arrow_forward</span>
          </button>
        </form>

        <div class="text-center mt-2">
          <a
            class="text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 transition-colors inline-flex items-center gap-1"
            href="/login"
          >
            <span class="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Log In
          </a>
        </div>

      </div>
    </main>

  </div>
</div>
