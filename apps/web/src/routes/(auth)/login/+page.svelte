<!-- Full-page login: split left/right panel layout -->
<div class="bg-[var(--color-background-light)] font-sans text-slate-900 min-h-screen flex flex-col antialiased">

  <!-- Top Navigation -->
  <header class="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 px-10 py-4 bg-[var(--color-background-light)] sticky top-0 z-50">
    <div class="flex items-center gap-4 text-slate-900">
      <div class="text-[var(--color-primary)] flex items-center justify-center">
        <span class="material-symbols-outlined text-3xl">security</span>
      </div>
      <h2 class="text-lg font-bold leading-tight tracking-[-0.015em]">Budget Guard</h2>
    </div>
    <div class="flex flex-1 justify-end gap-8">
      <div class="hidden md:flex items-center gap-9">
        <a class="text-sm font-medium leading-normal hover:text-[var(--color-primary)] transition-colors" href="/features">Features</a>
        <a class="text-sm font-medium leading-normal hover:text-[var(--color-primary)] transition-colors" href="/pricing">Pricing</a>
        <a class="text-sm font-medium leading-normal hover:text-[var(--color-primary)] transition-colors" href="/docs">Documentation</a>
      </div>
      <div class="flex gap-4">
        <a
          class="flex items-center justify-center overflow-hidden rounded-lg h-10 px-6 bg-slate-200 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-slate-300 transition-colors"
          href="/register"
        >
          Sign Up
        </a>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="flex-1 flex items-center justify-center p-4 md:p-8">
    <div class="max-w-6xl w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">

      <!-- Left Side: Testimonial/Hero -->
      <div class="hidden md:flex flex-col justify-center p-12 bg-slate-100 w-1/2 relative">
        <div class="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/10 to-transparent pointer-events-none"></div>
        <div class="relative z-10 max-w-md">
          <h1 class="text-4xl font-black leading-tight tracking-tight mb-6">
            Welcome back
          </h1>
          <div class="bg-white p-8 rounded-xl shadow-sm border border-slate-200 relative">
            <span class="material-symbols-outlined text-[var(--color-primary)]/30 text-6xl absolute -top-4 -left-4">format_quote</span>
            <p class="text-lg leading-relaxed mb-6 italic text-slate-700 relative z-10">
              "Budget Guard has saved us from several billing surprises. It's an essential tool for our infrastructure monitoring."
            </p>
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden">
                <span class="material-symbols-outlined text-slate-500">person</span>
              </div>
              <div>
                <p class="font-bold">Sarah Jenkins</p>
                <p class="text-sm text-slate-500">Lead Developer</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Side: Login Form -->
      <div class="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-center">
        <div class="max-w-md w-full mx-auto">
          <div class="mb-8 md:hidden">
            <h1 class="text-3xl font-black leading-tight tracking-tight">Welcome back</h1>
          </div>

          <!-- Social Auth -->
          <div class="flex flex-col gap-3 mb-8">
            <button class="w-full flex items-center justify-center gap-3 rounded-lg h-12 px-4 bg-white border border-slate-300 hover:bg-slate-50 transition-colors font-medium">
              <svg aria-hidden="true" class="h-5 w-5" viewBox="0 0 24 24">
                <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z" fill="#EA4335"></path>
                <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4"></path>
                <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05"></path>
                <path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.26538 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z" fill="#34A853"></path>
              </svg>
              <span>Log in with Google</span>
            </button>
            <button class="w-full flex items-center justify-center gap-3 rounded-lg h-12 px-4 bg-slate-900 text-white hover:bg-slate-800 transition-colors font-medium">
              <svg aria-hidden="true" class="h-5 w-5 fill-white" viewBox="0 0 24 24">
                <path clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" fill-rule="evenodd"></path>
              </svg>
              <span>Log in with GitHub</span>
            </button>
          </div>

          <!-- Divider -->
          <div class="relative flex py-5 items-center">
            <div class="flex-grow border-t border-slate-300"></div>
            <span class="flex-shrink-0 mx-4 text-slate-500 text-sm">or continue with email</span>
            <div class="flex-grow border-t border-slate-300"></div>
          </div>

          <!-- Email/Password Form -->
          <form class="flex flex-col gap-5" method="POST" action="?/login">
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium" for="email">Email Address</label>
              <input
                class="w-full rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] h-12 px-4 text-sm"
                id="email"
                name="email"
                placeholder="name@company.com"
                required
                type="email"
              />
            </div>
            <div class="flex flex-col gap-2">
              <div class="flex justify-between items-center">
                <label class="text-sm font-medium" for="password">Password</label>
                <a class="text-sm text-[var(--color-primary)] hover:underline font-medium" href="/forgot-password">Forgot Password?</a>
              </div>
              <input
                class="w-full rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] h-12 px-4 text-sm"
                id="password"
                name="password"
                placeholder="••••••••"
                required
                type="password"
              />
            </div>
            <button
              class="w-full flex items-center justify-center rounded-lg h-12 px-4 bg-[var(--color-primary)] text-white font-bold text-base hover:bg-[var(--color-primary)]/90 transition-colors mt-2 shadow-sm"
              type="submit"
            >
              Log In
            </button>
          </form>

          <p class="mt-8 text-center text-sm text-slate-600">
            Don't have an account?
            <a class="text-[var(--color-primary)] font-bold hover:underline" href="/register">Sign up</a>
          </p>
        </div>
      </div>

    </div>
  </main>

</div>
