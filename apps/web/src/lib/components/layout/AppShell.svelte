<script lang="ts">
import { page } from '$app/stores';

let { children }: { children: import('svelte').Snippet } = $props();

let mobileOpen = $state(false);

const sideNav = [
	{ label: 'Overview', href: '/dashboard', icon: 'grid_view', badge: 0 },
	{ label: 'Rules', href: '/rules', icon: 'rule', badge: 0 },
	{ label: 'Alerts', href: '/notifications', icon: 'notifications', badge: 3 },
	{ label: 'Billing', href: '/billing', icon: 'payments', badge: 0 },
	{ label: 'Integrations', href: '/integrations', icon: 'integration_instructions', badge: 0 },
	{ label: 'Settings', href: '/settings', icon: 'settings', badge: 0 },
];

const topNav = [
	{ label: 'Dashboard', href: '/dashboard' },
	{ label: 'Analytics', href: '/analytics' },
	{ label: 'Settings', href: '/settings' },
];

function sideActive(href: string) {
	return $page.url.pathname === href;
}

function topActive(href: string) {
	if (href === '/dashboard') {
		return [
			'/dashboard',
			'/billing',
			'/rules',
			'/notifications',
			'/integrations',
			'/anomalies',
			'/inventory',
		].some((p) => $page.url.pathname.startsWith(p));
	}
	return $page.url.pathname.startsWith(href);
}

function closeMenu() {
	mobileOpen = false;
}
</script>

<div class="bg-background-light font-display text-slate-900 min-h-screen antialiased">

	<!-- ═══════════════════ MOBILE DRAWER OVERLAY ═══════════════════ -->
	{#if mobileOpen}
		<!-- Backdrop -->
		<button
			class="fixed inset-0 z-40 bg-black/40 lg:hidden"
			onclick={closeMenu}
			aria-label="Close menu"
		></button>

		<!-- Drawer -->
		<div class="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl flex flex-col lg:hidden">
			<!-- Drawer header -->
			<div class="flex items-center justify-between px-5 py-4 border-b border-slate-200">
				<div class="flex items-center gap-3 text-slate-900">
					<div class="size-6 text-primary">
						<span class="material-symbols-outlined !text-[24px]">shield</span>
					</div>
					<h2 class="text-lg font-bold leading-tight tracking-[-0.015em]">FlareLens</h2>
				</div>
				<button onclick={closeMenu} class="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
					<span class="material-symbols-outlined !text-[22px]">close</span>
				</button>
			</div>

			<!-- Account card -->
			<div class="mx-4 mt-4 flex gap-3 items-center p-3 rounded-xl bg-slate-50 border border-slate-200">
				<div class="size-10 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
					<span class="material-symbols-outlined">cloud</span>
				</div>
				<div class="flex flex-col min-w-0">
					<p class="text-slate-900 text-sm font-semibold leading-normal truncate">Cloudflare</p>
					<p class="text-slate-500 text-xs font-medium leading-normal">Pro Plan</p>
				</div>
			</div>

			<!-- Nav -->
			<nav class="flex flex-col gap-1 px-3 mt-4 flex-1 overflow-y-auto">
				{#each sideNav as item}
					{@const active = sideActive(item.href)}
					<a href={item.href}
						onclick={closeMenu}
						class="flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors
							{active
								? 'bg-primary/10 text-primary font-semibold'
								: 'text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900'}">
						<span class="material-symbols-outlined !text-[20px]">{item.icon}</span>
						<span class="leading-normal">{item.label}</span>
						{#if item.badge > 0}
							<span class="ml-auto bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
								{item.badge}
							</span>
						{/if}
					</a>
				{/each}
			</nav>

			<!-- Upgrade CTA -->
			<div class="mx-4 mb-6 mt-4">
				<a href="/billing"
					onclick={closeMenu}
					class="flex items-center justify-center w-full h-10 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors">
					Upgrade to Pro
				</a>
			</div>
		</div>
	{/if}

	<div class="px-4 sm:px-8 lg:px-12 flex flex-1 justify-center py-4 sm:py-5">
		<div class="flex flex-col w-full max-w-[1440px] flex-1">

			<!-- ═══════════════════════════ HEADER ═══════════════════════════ -->
			<header class="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 mb-6 bg-white rounded-xl shadow-sm">
				<!-- Left: hamburger (mobile) + logo + search (desktop) -->
				<div class="flex items-center gap-3 sm:gap-8">
					<!-- Hamburger — mobile only -->
					<button
						onclick={() => mobileOpen = true}
						class="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0"
						aria-label="Open menu"
					>
						<span class="material-symbols-outlined !text-[24px]">menu</span>
					</button>

					<!-- Logo -->
					<div class="flex items-center gap-3 text-slate-900">
						<div class="size-6 text-primary shrink-0">
							<span class="material-symbols-outlined !text-[24px]">shield</span>
						</div>
						<h2 class="text-lg font-bold leading-tight tracking-[-0.015em] whitespace-nowrap">FlareLens</h2>
					</div>

					<!-- Search — desktop only -->
					<label class="hidden md:flex flex-col min-w-40 h-10 max-w-64">
						<div class="flex w-full flex-1 items-stretch rounded-lg h-full">
							<div class="text-slate-500 flex bg-slate-100 items-center justify-center pl-4 rounded-l-lg shrink-0">
								<span class="material-symbols-outlined !text-[20px]">search</span>
							</div>
							<input
								class="flex w-full min-w-0 flex-1 rounded-lg text-slate-900 focus:outline-none border-none bg-slate-100 h-full placeholder:text-slate-500 px-3 rounded-l-none text-sm font-normal leading-normal"
								placeholder="Search resources..."
							/>
						</div>
					</label>
				</div>

				<!-- Right: top nav + search icon (mobile) + upgrade + avatar -->
				<div class="flex items-center gap-3 sm:gap-6">
					<!-- Top nav — desktop only -->
					<nav class="hidden lg:flex items-center gap-8">
						{#each topNav as item}
							<a href={item.href}
								class="text-sm font-medium leading-normal transition-colors py-2
									{topActive(item.href)
										? 'text-primary font-semibold border-b-2 border-primary'
										: 'text-slate-600 hover:text-slate-900'}">
								{item.label}
							</a>
						{/each}
					</nav>

					<!-- Search icon — mobile only -->
					<button class="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
						<span class="material-symbols-outlined !text-[22px]">search</span>
					</button>

					<!-- Upgrade — hidden on smallest screens -->
					<a href="/billing"
						class="hidden sm:flex min-w-[84px] cursor-pointer items-center justify-center rounded-lg h-9 px-4 bg-primary text-white text-sm font-semibold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors shrink-0">
						Upgrade
					</a>

					<!-- Avatar -->
					<div class="w-9 h-9 rounded-full bg-slate-200 border border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600 cursor-pointer shrink-0">
						JD
					</div>
				</div>
			</header>

			<!-- ═══════════════════════ BODY ═══════════════════════ -->
			<div class="flex flex-col lg:flex-row gap-6 lg:gap-8">

				<!-- ═══════════════════════════ SIDEBAR — desktop only ═══════════════════════════ -->
				<aside class="hidden lg:flex w-64 shrink-0 flex-col gap-6 px-4 bg-white rounded-xl shadow-sm border border-slate-200 py-6">

					<!-- Account card -->
					<div class="flex gap-3 items-center p-3 rounded-xl bg-slate-50 border border-slate-200">
						<div class="size-10 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
							<span class="material-symbols-outlined">cloud</span>
						</div>
						<div class="flex flex-col min-w-0">
							<p class="text-slate-900 text-sm font-semibold leading-normal truncate">Cloudflare</p>
							<p class="text-slate-500 text-xs font-medium leading-normal">Pro Plan</p>
						</div>
					</div>

					<!-- Nav -->
					<nav class="flex flex-col gap-1">
						{#each sideNav as item}
							{@const active = sideActive(item.href)}
							<a href={item.href}
								class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
									{active
										? 'bg-primary/10 text-primary font-semibold'
										: 'text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900'}">
								<span class="material-symbols-outlined !text-[20px]">{item.icon}</span>
								<span class="leading-normal">{item.label}</span>
								{#if item.badge > 0}
									<span class="ml-auto bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
										{item.badge}
									</span>
								{/if}
							</a>
						{/each}
					</nav>
				</aside>

				<!-- ═══════════════════════════ PAGE CONTENT ═══════════════════════════ -->
				<main class="flex-1 min-w-0 pb-8">
					{@render children()}
				</main>
			</div>

		</div>
	</div>
</div>
