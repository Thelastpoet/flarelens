<!-- Full-page register: split left marketing panel / right sign-up form -->
<div class="bg-[var(--color-background-light)] font-sans text-slate-900 antialiased h-screen flex overflow-hidden">
  <div class="flex w-full h-full">

    <!-- Left Panel: Marketing -->
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
            Stop unexpected infrastructure costs.
          </h1>
          <p class="text-lg text-slate-600">
            Join thousands of developers using AI-driven anomaly detection to secure their Cloudflare bills.
          </p>
        </div>

        <!-- Feature cards -->
        <div class="flex flex-col gap-6 mt-4">
          <div class="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div class="size-10 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined">timer</span>
            </div>
            <div>
              <h3 class="font-bold text-slate-900">Connect in 5 minutes</h3>
              <p class="text-sm text-slate-500">Seamless integration via API tokens.</p>
            </div>
          </div>
          <div class="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div class="size-10 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined">credit_card_off</span>
            </div>
            <div>
              <h3 class="font-bold text-slate-900">No credit card required</h3>
              <p class="text-sm text-slate-500">Start monitoring your usage for free.</p>
            </div>
          </div>
          <div class="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div class="size-10 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined">security</span>
            </div>
            <div>
              <h3 class="font-bold text-slate-900">Immediate protection</h3>
              <p class="text-sm text-slate-500">Active monitoring starts the moment you connect.</p>
            </div>
          </div>
        </div>

      </div>
      <!-- Decorative blob -->
      <div class="absolute -bottom-32 -left-32 size-96 bg-[var(--color-primary)]/20 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
    </div>

    <!-- Right Panel: Sign-up form -->
    <div class="flex flex-col flex-1 overflow-y-auto">
      <div class="flex-1 flex flex-col justify-center px-4 py-12 sm:px-6 lg:px-20 xl:px-24">
        <div class="mx-auto w-full max-w-sm lg:w-96">

          <!-- Mobile logo -->
          <div class="flex items-center gap-3 text-slate-900 mb-8 lg:hidden justify-center">
            <div class="size-6 text-[var(--color-primary)]">
              <span class="material-symbols-outlined text-2xl">shield_lock</span>
            </div>
            <h2 class="text-xl font-bold leading-tight tracking-[-0.015em]">Budget Guard</h2>
          </div>

          <div class="text-center lg:text-left mb-8">
            <h2 class="text-3xl font-bold tracking-tight text-slate-900">Create your account</h2>
            <p class="mt-2 text-sm text-slate-600">
              Get started with proactive bill protection.
            </p>
          </div>

          <div class="mt-8">
            <!-- OAuth buttons -->
            <div class="grid grid-cols-2 gap-3">
              <a
                class="flex w-full items-center justify-center gap-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus-visible:ring-transparent"
                href="/auth/google"
              >
                <svg aria-hidden="true" class="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z" fill="#EA4335"></path>
                  <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4"></path>
                  <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05"></path>
                  <path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.26538 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z" fill="#34A853"></path>
                </svg>
                <span class="text-sm font-semibold leading-6">Google</span>
              </a>
              <a
                class="flex w-full items-center justify-center gap-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus-visible:ring-transparent"
                href="/auth/github"
              >
                <svg aria-hidden="true" class="h-5 w-5 fill-slate-900" viewBox="0 0 24 24">
                  <path clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" fill-rule="evenodd"></path>
                </svg>
                <span class="text-sm font-semibold leading-6">GitHub</span>
              </a>
            </div>

            <!-- Divider -->
            <div class="relative mt-8">
              <div aria-hidden="true" class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-slate-200"></div>
              </div>
              <div class="relative flex justify-center text-sm font-medium leading-6">
                <span class="bg-[var(--color-background-light)] px-6 text-slate-500">Or continue with</span>
              </div>
            </div>

            <!-- Registration form -->
            <form class="mt-8 space-y-6" method="POST" action="?/register">
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium leading-6 text-slate-900" for="name">Full name</label>
                  <div class="mt-2">
                    <input
                      autocomplete="name"
                      class="block w-full rounded-md border-0 py-2.5 text-slate-900 bg-white shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)] sm:text-sm sm:leading-6"
                      id="name"
                      name="name"
                      required
                      type="text"
                    />
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium leading-6 text-slate-900" for="email">Email address</label>
                  <div class="mt-2">
                    <input
                      autocomplete="email"
                      class="block w-full rounded-md border-0 py-2.5 text-slate-900 bg-white shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)] sm:text-sm sm:leading-6"
                      id="email"
                      name="email"
                      required
                      type="email"
                    />
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium leading-6 text-slate-900" for="password">Password</label>
                  <div class="mt-2">
                    <input
                      autocomplete="new-password"
                      class="block w-full rounded-md border-0 py-2.5 text-slate-900 bg-white shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-[var(--color-primary)] sm:text-sm sm:leading-6"
                      id="password"
                      name="password"
                      required
                      type="password"
                    />
                  </div>
                </div>
              </div>
              <div>
                <button
                  class="flex w-full justify-center rounded-md bg-[var(--color-primary)] px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-[var(--color-primary)]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] transition-colors"
                  type="submit"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>

          <div class="mt-8 text-center space-y-4">
            <p class="text-sm text-slate-500">
              Already have an account?
              <a class="font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary)]/80" href="/login">Log in</a>
            </p>
            <p class="text-xs text-slate-500">
              By signing up, you agree to our
              <a class="underline hover:text-slate-700" href="/terms">Terms of Service</a>
              and
              <a class="underline hover:text-slate-700" href="/privacy">Privacy Policy</a>.
            </p>
          </div>

        </div>
      </div>
    </div>

  </div>
</div>
