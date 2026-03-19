<script lang="ts">
let mobileNavOpen = $state(false);
</script>

<div class="bg-background-light font-display text-slate-900 antialiased overflow-x-hidden">

	<!-- ═══════════════════════ NAVBAR ═══════════════════════ -->
	<header class="flex items-center justify-between px-4 md:px-10 lg:px-40 py-3 border-b border-slate-200 bg-background-light sticky top-0 z-30">
		<div class="flex items-center gap-3">
			<div class="size-6 text-primary">
				<span class="material-symbols-outlined text-2xl">shield_lock</span>
			</div>
			<h2 class="text-lg font-bold leading-tight tracking-[-0.015em]">FlareLens</h2>
		</div>

		<!-- Desktop nav -->
		<div class="hidden md:flex items-center gap-9">
			<a href="#features"     class="text-slate-700 hover:text-primary transition-colors text-sm font-medium">Features</a>
			<a href="#testimonials" class="text-slate-700 hover:text-primary transition-colors text-sm font-medium">Testimonials</a>
			<a href="#pricing"      class="text-slate-700 hover:text-primary transition-colors text-sm font-medium">Pricing</a>
			<a href="/docs"         class="text-slate-700 hover:text-primary transition-colors text-sm font-medium">Docs</a>
		</div>

		<!-- Desktop CTA -->
		<div class="hidden md:flex gap-2">
			<a href="/login"
				class="flex min-w-[84px] items-center justify-center rounded-lg h-10 px-4 bg-slate-200 hover:bg-slate-300 text-slate-900 text-sm font-bold tracking-[0.015em] transition-colors">
				Log In
			</a>
			<a href="/register"
				class="flex min-w-[84px] items-center justify-center rounded-lg h-10 px-4 bg-primary hover:bg-primary/90 text-white text-sm font-bold tracking-[0.015em] transition-colors">
				Get Started
			</a>
		</div>

		<!-- Mobile hamburger -->
		<button
			onclick={() => mobileNavOpen = !mobileNavOpen}
			class="md:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
			aria-label="Toggle menu"
		>
			<span class="material-symbols-outlined">{mobileNavOpen ? 'close' : 'menu'}</span>
		</button>
	</header>

	<!-- Mobile nav dropdown -->
	{#if mobileNavOpen}
		<div class="md:hidden fixed inset-x-0 top-[57px] z-20 bg-white border-b border-slate-200 shadow-lg px-4 py-4 flex flex-col gap-1">
			{#each [['#features','Features'],['#testimonials','Testimonials'],['#pricing','Pricing'],['/docs','Docs']] as [href, label]}
				<a {href} onclick={() => mobileNavOpen = false}
					class="px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-primary rounded-lg transition-colors">
					{label}
				</a>
			{/each}
			<div class="flex gap-2 mt-3 pt-3 border-t border-slate-100">
				<a href="/login"
					class="flex-1 flex items-center justify-center h-10 rounded-lg bg-slate-100 text-slate-900 text-sm font-bold hover:bg-slate-200 transition-colors">
					Log In
				</a>
				<a href="/register"
					class="flex-1 flex items-center justify-center h-10 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors">
					Get Started
				</a>
			</div>
		</div>
	{/if}

	<!-- ═══════════════════════ HERO ═══════════════════════ -->
	<section class="px-4 md:px-10 lg:px-40 py-16 lg:py-24">
		<div class="max-w-[1200px] mx-auto flex flex-col lg:flex-row lg:items-center gap-10 lg:gap-16">
			<div class="flex flex-col gap-8 flex-1">
				<div class="flex flex-col gap-4">
					<div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium w-fit">
						<span class="material-symbols-outlined !text-[16px]">new_releases</span>
						<span>New: Automatic Mitigation Rules</span>
					</div>
					<h1 class="text-slate-900 text-4xl font-black leading-tight tracking-[-0.033em] sm:text-5xl lg:text-6xl">
						Stop Surprise Cloudflare Bills Before They Happen
					</h1>
					<p class="text-slate-600 text-base sm:text-lg font-normal leading-relaxed max-w-2xl">
						AI-driven anomaly detection to monitor usage, prevent unexpected infrastructure costs, and keep your business online without breaking the bank.
					</p>
				</div>
				<div class="flex flex-wrap gap-4">
					<a href="/register"
						class="flex min-w-[140px] items-center justify-center rounded-lg h-12 px-6 bg-primary hover:bg-primary/90 text-white text-base font-bold tracking-[0.015em] transition-colors shadow-sm shadow-primary/20">
						Get Started for Free
					</a>
					<a href="#demo"
						class="flex min-w-[140px] items-center justify-center rounded-lg h-12 px-6 border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-base font-bold transition-colors">
						<span class="material-symbols-outlined mr-2 !text-[20px]">play_circle</span>
						Watch Demo
					</a>
				</div>
				<div class="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
					<div class="flex items-center gap-1">
						<span class="material-symbols-outlined text-emerald-500 !text-[18px]">check_circle</span>
						<span>No credit card required</span>
					</div>
					<div class="flex items-center gap-1">
						<span class="material-symbols-outlined text-emerald-500 !text-[18px]">check_circle</span>
						<span>Setup in 5 minutes</span>
					</div>
				</div>
			</div>

			<!-- Product preview card -->
			<div class="flex-1 w-full rounded-xl overflow-hidden shadow-2xl border border-slate-200 bg-white relative aspect-[4/3] lg:h-[460px] lg:aspect-auto">
				<div class="absolute inset-0 bg-slate-100 flex items-center justify-center">
					<div class="text-center text-slate-400 select-none">
						<span class="material-symbols-outlined !text-[64px] mb-2 block">analytics</span>
						<p class="text-sm font-medium">Dashboard Preview</p>
					</div>
				</div>
				<div class="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
				<div class="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-4 border border-white/20 shadow-lg">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-xs text-slate-500 font-medium uppercase tracking-wider">Current Month Estimate</p>
							<p class="text-2xl font-bold text-slate-900">$42.50</p>
						</div>
						<div class="text-right">
							<p class="text-xs text-slate-500 font-medium uppercase tracking-wider">Status</p>
							<div class="inline-flex items-center gap-1 text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md text-xs font-bold">
								<span class="material-symbols-outlined !text-[14px]">verified_user</span>
								Protected
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- ═══════════════════════ FEATURES ═══════════════════════ -->
	<section id="features" class="px-4 md:px-10 lg:px-40 py-16">
		<div class="max-w-[1200px] mx-auto bg-slate-50 rounded-2xl p-8 md:p-12">
			<div class="flex flex-col gap-4 items-center text-center mb-12">
				<h2 class="text-slate-900 text-3xl sm:text-4xl font-bold leading-tight max-w-[720px]">
					Protect Your Infrastructure
				</h2>
				<p class="text-slate-600 text-lg max-w-[720px]">
					Comprehensive tools to keep your cloud spend predictable and under control.
				</p>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
				{#each [
					{ icon: 'radar',      title: 'Early Detection',      desc: 'Identify abnormal usage patterns instantly using advanced AI algorithms that learn your baseline traffic.' },
					{ icon: 'security',   title: 'Automatic Mitigation', desc: 'Automatically apply rate limits, CAPTCHAs, or block bad traffic before costs spiral out of control.' },
					{ icon: 'monitoring', title: 'Usage Analytics',      desc: 'Analyze detailed cost metrics, segment traffic sources, and optimize your setup for maximum efficiency.' },
				] as feat}
					<div class="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
						<div class="size-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
							<span class="material-symbols-outlined text-2xl">{feat.icon}</span>
						</div>
						<h3 class="text-slate-900 text-xl font-bold leading-tight">{feat.title}</h3>
						<p class="text-slate-600 text-base leading-relaxed">{feat.desc}</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- ═══════════════════════ TESTIMONIALS ═══════════════════════ -->
	<section id="testimonials" class="px-4 md:px-10 lg:px-40 py-16">
		<div class="max-w-[1200px] mx-auto">
			<div class="text-center mb-12">
				<h2 class="text-slate-900 text-3xl font-bold tracking-[-0.015em] pb-3">Trusted by Developers Everywhere</h2>
				<p class="text-slate-600">See what others are saying about FlareLens.</p>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each [
					{ name: 'Alex D.',  role: 'Lead DevOps',         stars: 5,   quote: 'FlareLens caught a rogue bot script before it cost us thousands. Absolute lifesaver. The ROI was immediate within the first week.' },
					{ name: 'Sarah K.', role: 'CTO',                 stars: 5,   quote: "Setup took less than 5 minutes. The automatic mitigation just works without hassle. I don't have to constantly check the Cloudflare dashboard anymore." },
					{ name: 'Mike T.',  role: 'Full Stack Developer', stars: 4.5, quote: 'The usage analytics finally give us visibility into what is driving our Cloudflare bill. The reports are clean and actionable.' },
				] as t}
					<div class="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
						<div class="flex items-center gap-3">
							<div class="size-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-semibold text-sm shrink-0">
								{t.name.split(' ').map(n => n[0]).join('')}
							</div>
							<div>
								<p class="text-slate-900 text-base font-medium">{t.name}</p>
								<p class="text-slate-500 text-sm">{t.role}</p>
							</div>
						</div>
						<div class="flex gap-0.5 text-primary">
							{#each {length: Math.floor(t.stars)} as _}
								<span class="material-symbols-outlined text-lg">star</span>
							{/each}
							{#if t.stars % 1 !== 0}
								<span class="material-symbols-outlined text-lg">star_half</span>
							{/if}
						</div>
						<p class="text-slate-700 text-base leading-relaxed">"{t.quote}"</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- ═══════════════════════ PRICING ═══════════════════════ -->
	<section id="pricing" class="px-4 md:px-10 lg:px-40 py-16 bg-slate-50/80">
		<div class="max-w-[960px] mx-auto">
			<div class="text-center mb-12">
				<h2 class="text-3xl md:text-4xl font-bold tracking-[-0.015em] pb-3">Simple, transparent pricing</h2>
				<p class="text-slate-600 max-w-2xl mx-auto">No hidden fees, cancel anytime.</p>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
				<!-- Hobby -->
				<div class="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
					<div class="flex flex-col gap-2">
						<h3 class="text-xl font-bold">Hobby</h3>
						<p class="text-4xl font-black tracking-[-0.033em]">Free</p>
						<p class="text-sm text-slate-600">For personal projects and exploration.</p>
					</div>
					<a href="/register" class="flex w-full items-center justify-center rounded-lg h-12 bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-bold transition-colors border border-slate-200">Get Started</a>
					<div class="flex flex-col gap-3 pt-4 border-t border-slate-100">
						{#each ['1 worker monitored','Daily alerts','7-day data retention','Community support'] as f}
							<div class="text-sm flex gap-3 items-start">
								<span class="material-symbols-outlined text-slate-400 text-xl shrink-0">check</span><span>{f}</span>
							</div>
						{/each}
					</div>
				</div>

				<!-- Pro -->
				<div class="relative flex flex-col gap-6 rounded-xl border-2 border-primary bg-white p-8 shadow-md md:-translate-y-4">
					<div class="absolute top-0 right-8 -translate-y-1/2">
						<span class="text-xs font-bold rounded-full bg-primary text-white px-3 py-1 shadow-sm">Most Popular</span>
					</div>
					<div class="flex flex-col gap-2">
						<h3 class="text-xl font-bold">Pro</h3>
						<p class="flex items-baseline gap-1">
							<span class="text-4xl font-black tracking-[-0.033em]">$29</span>
							<span class="text-base font-bold text-slate-500">/mo</span>
						</p>
						<p class="text-sm text-slate-600">For startups and growing teams.</p>
					</div>
					<a href="/register" class="flex w-full items-center justify-center rounded-lg h-12 bg-primary hover:bg-primary/90 text-white text-sm font-bold transition-colors shadow-sm">Get Started</a>
					<div class="flex flex-col gap-3 pt-4 border-t border-slate-100">
						{#each ['Unlimited workers monitored','Real-time anomaly detection','Instant SMS & Email alerts','30-day data retention','Priority email support'] as f}
							<div class="text-sm flex gap-3 items-start">
								<span class="material-symbols-outlined text-primary text-xl shrink-0">check</span><span>{f}</span>
							</div>
						{/each}
					</div>
				</div>

				<!-- Enterprise -->
				<div class="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
					<div class="flex flex-col gap-2">
						<h3 class="text-xl font-bold">Enterprise</h3>
						<p class="text-4xl font-black tracking-[-0.033em]">Custom</p>
						<p class="text-sm text-slate-600">For large scale infrastructure.</p>
					</div>
					<a href="/contact" class="flex w-full items-center justify-center rounded-lg h-12 bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-bold transition-colors border border-slate-200">Contact Sales</a>
					<div class="flex flex-col gap-3 pt-4 border-t border-slate-100">
						{#each ['Everything in Pro','Custom API integrations','Advanced RBAC','Unlimited data retention','24/7 Dedicated phone support'] as f}
							<div class="text-sm flex gap-3 items-start">
								<span class="material-symbols-outlined text-slate-400 text-xl shrink-0">check</span><span>{f}</span>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- FAQ -->
			<div class="mt-16">
				<h2 class="text-2xl md:text-3xl font-bold text-center mb-10">Frequently Asked Questions</h2>
				<div class="flex flex-col gap-4 max-w-3xl mx-auto">
					{#each [
						{ q: 'What happens if I exceed my plan limits?', a: 'If you exceed your worker limit on the Free plan, we will stop tracking new workers until the next billing cycle. On the Pro plan, limits are soft and we will notify you if usage is consistently high.' },
						{ q: 'Can I upgrade or downgrade my plan anytime?', a: 'Yes, you can easily change your plan from your dashboard. Upgrades take effect immediately, and downgrades apply at the start of your next billing cycle.' },
						{ q: 'Do you offer refunds?', a: "We offer a 14-day money-back guarantee for all new subscriptions. If you're not satisfied, just contact support within your first two weeks for a full refund." },
					] as faq}
						<details class="flex flex-col rounded-xl border border-slate-200 bg-white px-6 py-4 group cursor-pointer hover:shadow-sm transition-shadow">
							<summary class="flex items-center justify-between gap-6 py-2 list-none outline-none">
								<p class="text-base font-medium">{faq.q}</p>
								<span class="material-symbols-outlined text-slate-400 group-open:rotate-180 transition-transform duration-200 shrink-0">expand_more</span>
							</summary>
							<p class="text-slate-600 text-sm leading-relaxed pt-3 pb-2 border-t border-slate-100 mt-2">{faq.a}</p>
						</details>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<!-- ═══════════════════════ CTA ═══════════════════════ -->
	<section class="px-4 md:px-10 lg:px-40 py-20 text-center">
		<div class="max-w-3xl mx-auto flex flex-col items-center gap-6">
			<h2 class="text-slate-900 text-3xl font-bold md:text-4xl">Ready to secure your infrastructure costs?</h2>
			<p class="text-slate-600 text-lg">Join thousands of developers who sleep better at night knowing their bills are guarded.</p>
			<a href="/register"
				class="mt-4 flex min-w-[160px] items-center justify-center rounded-lg h-14 px-8 bg-primary hover:bg-primary/90 text-white text-lg font-bold tracking-wide transition-colors shadow-lg shadow-primary/30">
				Start Your Free Trial
			</a>
		</div>
	</section>

	<!-- ═══════════════════════ FOOTER ═══════════════════════ -->
	<footer class="border-t border-slate-200 py-8 px-4 md:px-10 lg:px-40 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
		<div class="flex items-center gap-2">
			<span class="material-symbols-outlined text-primary text-xl">shield_lock</span>
			<span class="font-bold text-slate-900">FlareLens</span>
			<span>© 2026. All rights reserved.</span>
		</div>
		<div class="flex gap-6">
			<a href="/privacy" class="hover:text-primary transition-colors">Privacy</a>
			<a href="/terms"   class="hover:text-primary transition-colors">Terms</a>
			<a href="/contact" class="hover:text-primary transition-colors">Contact</a>
		</div>
	</footer>

</div>
